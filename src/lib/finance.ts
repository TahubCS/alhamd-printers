// Pure business calculations shared by server actions.
// Kept free of Prisma and Next.js imports so they can be unit tested directly.

export type InvoiceStatusValue = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "BAD_DEBT";
export type ChequeStatusValue = "RECEIVED" | "DEPOSITED" | "CLEARED" | "BOUNCED";
export type WageTypeValue = "PAYMENT" | "ADVANCE" | "DEDUCTION" | "ADJUSTMENT";
export type StockMovementValue = "IN" | "OUT" | "ADJUSTMENT";
export type POStatusValue = "OPEN" | "PARTIAL" | "CLOSED";

/** Round to paisa (2 decimals) without floating point drift such as 0.1 + 0.2. */
export function roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface LineInput {
    quantity: number;
    rate: number;
    gstRate?: number;
}

export interface LineTotals {
    amount: number;
    tax: number;
}

export function calculateLine(line: LineInput): LineTotals {
    const amount = roundMoney(line.quantity * line.rate);
    const tax = roundMoney((amount * (line.gstRate || 0)) / 100);
    return { amount, tax };
}

/** Subtotal, GST and grand total for a document, recomputed from quantities and rates. */
export function calculateDocumentTotals(lines: LineInput[]) {
    let subtotal = 0;
    let taxTotal = 0;
    const computed = lines.map((line) => {
        const totals = calculateLine(line);
        subtotal += totals.amount;
        taxTotal += totals.tax;
        return totals;
    });
    subtotal = roundMoney(subtotal);
    taxTotal = roundMoney(taxTotal);
    return { lines: computed, subtotal, taxTotal, total: roundMoney(subtotal + taxTotal) };
}

export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/** A customer PO is closed once its invoices cover its total. */
export function derivePOStatus(invoicedTotal: number, poTotal: number): POStatusValue {
    if (invoicedTotal <= 0) return "OPEN";
    return roundMoney(invoicedTotal) >= roundMoney(poTotal) ? "CLOSED" : "PARTIAL";
}

export interface InvoiceForStatus {
    id: string;
    date: Date;
    dueDate: Date;
    total: number;
}

/**
 * Payments are recorded against the customer account, not individual invoices,
 * so invoice status is derived by allocating the outstanding balance to the
 * newest invoices first (oldest invoices are considered paid first).
 */
export function deriveInvoiceStatuses(
    invoices: InvoiceForStatus[],
    outstandingBalance: number,
    options: { now?: Date; isBadDebt?: boolean } = {}
): Map<string, InvoiceStatusValue> {
    const now = options.now ?? new Date();
    const statuses = new Map<string, InvoiceStatusValue>();
    let remaining = Math.max(0, roundMoney(outstandingBalance));

    const newestFirst = [...invoices].sort((a, b) => {
        const byDate = b.date.getTime() - a.date.getTime();
        return byDate !== 0 ? byDate : b.id.localeCompare(a.id);
    });

    for (const invoice of newestFirst) {
        const total = roundMoney(invoice.total);
        let status: InvoiceStatusValue;
        if (remaining <= 0) {
            status = "PAID";
        } else {
            status = remaining >= total ? "PENDING" : "PARTIAL";
            remaining = roundMoney(remaining - Math.min(remaining, total));
            if (options.isBadDebt) {
                status = "BAD_DEBT";
            } else if (invoice.dueDate.getTime() < now.getTime()) {
                status = "OVERDUE";
            }
        }
        statuses.set(invoice.id, status);
    }

    return statuses;
}

/** Status shown to users: an unpaid invoice past its due date reads as overdue. */
export function effectiveInvoiceStatus(
    status: InvoiceStatusValue,
    dueDate: Date,
    now: Date = new Date()
): InvoiceStatusValue {
    if ((status === "PENDING" || status === "PARTIAL") && dueDate.getTime() < now.getTime()) {
        return "OVERDUE";
    }
    return status;
}

const CHEQUE_TRANSITIONS: Record<ChequeStatusValue, ChequeStatusValue[]> = {
    RECEIVED: ["DEPOSITED", "BOUNCED"],
    DEPOSITED: ["CLEARED", "BOUNCED"],
    CLEARED: [],
    BOUNCED: [],
};

export function canTransitionCheque(from: ChequeStatusValue, to: ChequeStatusValue): boolean {
    return CHEQUE_TRANSITIONS[from].includes(to);
}

/**
 * Worker balance convention: negative means the worker owes the company.
 * Advances push the balance down; payments, deductions and adjustments push it up.
 */
export function wageBalanceChange(type: WageTypeValue, amount: number): number {
    return type === "ADVANCE" ? -amount : amount;
}

/** Signed stock movement. Adjustments are entered with their own sign. */
export function stockChange(type: StockMovementValue, quantity: number): number {
    return type === "OUT" ? -quantity : quantity;
}
