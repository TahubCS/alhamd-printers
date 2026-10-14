import { calculateDocumentTotals, roundMoney } from "@/lib/finance";

/*
 * Deterministic checks on what the model read. The model transcribes; this
 * code does the arithmetic and decides whether the result can be trusted.
 * Errors trigger a second read with the stronger model and are shown to the
 * person reviewing the document; warnings are only shown.
 */

export type CheckLevel = "error" | "warning";

export type CheckCode =
    | "noItems"
    | "noCustomerName"
    | "zeroQuantity"
    | "lineMath"
    | "rowCount"
    | "totalMismatch"
    | "invalidDate"
    | "unusualGst"
    | "taxIdFormat"
    | "unreadable"
    | "notPurchaseOrder"
    | "noAmount"
    | "receiptTotalMismatch"
    | "futureDate"
    | "oldDate"
    | "foreignCurrency"
    | "notReceipt";

export interface ExtractionCheck {
    code: CheckCode;
    level: CheckLevel;
    /** 1-based item line the check refers to */
    line?: number;
    values?: Record<string, string | number>;
}

export function countErrors(checks: ExtractionCheck[]) {
    return checks.filter((c) => c.level === "error").length;
}

/** Equal within rounding: Rs 1, or 0.5% of the larger value. */
export function near(a: number, b: number) {
    return Math.abs(a - b) <= Math.max(1, 0.005 * Math.max(Math.abs(a), Math.abs(b)));
}

/** Accepts only a real calendar date in YYYY-MM-DD form. */
export function parseIsoDate(value: string | null | undefined): string | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value) ? value : null;
}

/** NTN / STRN as digits and dashes only. */
export function normalizeTaxId(value: string | null | undefined): string | null {
    const cleaned = (value || "").replace(/[^\d-]/g, "").replace(/^-+|-+$/g, "");
    return cleaned || null;
}

/**
 * Pakistani NTN is 7 digits plus a check digit (1234567-8), or a 13-digit
 * CNIC for individuals; STRN is 13 digits. Anything else is probably misread.
 */
export function looksLikeTaxId(value: string) {
    const digits = value.replace(/-/g, "");
    return /^\d{7}-?\d$/.test(value) || digits.length === 13;
}

function cleanText(value: string | null | undefined): string | null {
    const text = (value || "").replace(/\s+/g, " ").trim();
    return text || null;
}

// ---------------------------------------------------------------- PO

/** Shape the model returns for a purchase order (see PO_SCHEMA). */
export interface RawPO {
    documentType: string;
    poNumber: string | null;
    date: string | null;
    customer: {
        name: string | null;
        nameUrdu: string | null;
        phone: string | null;
        email: string | null;
        address: string | null;
        ntn: string | null;
        gstNumber: string | null;
    };
    extraColumns: string[];
    items: {
        description: string;
        productCode: string | null;
        quantity: number;
        unit: string | null;
        rate: number;
        gstRate: number | null;
        amount: number | null;
        extraValues: { column: string; value: string | null }[];
    }[];
    lastSerialNumber: number | null;
    printedTaxTotal: number | null;
    printedGrandTotal: number | null;
    paymentTerms: string | null;
    deliveryDate: string | null;
    notes: string | null;
    unreadable: string[];
}

export interface ExtractedPOItem {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
    gstRate: number;
    unit?: string;
    productCode?: string;
    customAttributes: Record<string, string | null>;
}

export interface ExtractedPOData {
    poNumber: string | null;
    date: string | null;
    customer: {
        name: string | null;
        nameUrdu?: string | null;
        phone?: string | null;
        email?: string | null;
        address?: string | null;
        ntn?: string | null;
        gstNumber?: string | null;
    };
    totalAmount: number;
    items: ExtractedPOItem[];
    paymentTerms?: string | null;
    deliveryDate?: string | null;
    notes?: string | null;
    checks: ExtractionCheck[];
    /** Model whose reading was kept */
    model: string;
    /** True when the first reading failed its checks and was read again */
    escalated: boolean;
}

/** Turns the model's transcription into the form data and runs every check. */
export function reviewPO(raw: RawPO, model: string, escalated = false): ExtractedPOData {
    const checks: ExtractionCheck[] = [];
    const columns = [...new Set(raw.extraColumns.map((c) => c.trim()).filter(Boolean))];

    const items: ExtractedPOItem[] = raw.items
        .filter((item) => cleanText(item.description))
        .map((item, index) => {
            const line = index + 1;
            const quantity = item.quantity;
            const rate = roundMoney(Math.max(0, item.rate));
            const gstRate = Math.max(0, item.gstRate ?? 0);
            const net = roundMoney(quantity * rate);

            if (!(quantity > 0)) checks.push({ code: "zeroQuantity", level: "error", line });
            if (item.amount !== null && !near(item.amount, net) && !near(item.amount, net * (1 + gstRate / 100))) {
                checks.push({ code: "lineMath", level: "error", line, values: { printed: item.amount, expected: net } });
            }
            if (gstRate > 30) checks.push({ code: "unusualGst", level: "warning", line, values: { rate: gstRate } });

            // Every line carries every extra column so the table stays rectangular
            const customAttributes: Record<string, string | null> = {};
            for (const column of columns) {
                const cell = item.extraValues.find((v) => v.column.trim() === column);
                customAttributes[column] = cleanText(cell?.value);
            }

            return {
                description: cleanText(item.description)!,
                quantity,
                rate,
                amount: net,
                gstRate,
                unit: cleanText(item.unit) ?? undefined,
                productCode: cleanText(item.productCode) ?? undefined,
                customAttributes,
            };
        });

    if (items.length === 0) checks.push({ code: "noItems", level: "error" });
    if (raw.lastSerialNumber && raw.lastSerialNumber !== items.length) {
        checks.push({ code: "rowCount", level: "error", values: { printed: raw.lastSerialNumber, found: items.length } });
    }

    const totals = calculateDocumentTotals(items);
    if (raw.printedGrandTotal !== null && items.length > 0 &&
        !near(raw.printedGrandTotal, totals.total) && !near(raw.printedGrandTotal, totals.subtotal)) {
        checks.push({ code: "totalMismatch", level: "error", values: { printed: raw.printedGrandTotal, calculated: totals.total } });
    }

    const customerName = cleanText(raw.customer.name);
    if (!customerName) checks.push({ code: "noCustomerName", level: "error" });

    const date = parseIsoDate(raw.date);
    if (raw.date && !date) checks.push({ code: "invalidDate", level: "warning", values: { value: raw.date } });

    const ntn = normalizeTaxId(raw.customer.ntn);
    const gstNumber = normalizeTaxId(raw.customer.gstNumber);
    for (const [field, value] of [["NTN", ntn], ["STRN", gstNumber]] as const) {
        if (value && !looksLikeTaxId(value)) checks.push({ code: "taxIdFormat", level: "warning", values: { field, value } });
    }

    if (raw.documentType !== "purchase_order") {
        checks.push({ code: "notPurchaseOrder", level: "warning", values: { type: raw.documentType } });
    }
    const unreadable = raw.unreadable.map((u) => u.trim()).filter(Boolean);
    if (unreadable.length > 0) checks.push({ code: "unreadable", level: "warning", values: { fields: unreadable.join(", ") } });

    return {
        poNumber: cleanText(raw.poNumber),
        date,
        customer: {
            name: customerName,
            nameUrdu: cleanText(raw.customer.nameUrdu),
            phone: cleanText(raw.customer.phone),
            email: cleanText(raw.customer.email)?.toLowerCase() ?? null,
            address: cleanText(raw.customer.address),
            ntn,
            gstNumber,
        },
        totalAmount: totals.total,
        items,
        paymentTerms: cleanText(raw.paymentTerms),
        deliveryDate: parseIsoDate(raw.deliveryDate),
        notes: cleanText(raw.notes),
        checks,
        model,
        escalated,
    };
}

// ---------------------------------------------------------------- Receipt

/** Shape the model returns for a receipt (see RECEIPT_SCHEMA). */
export interface RawReceipt {
    isReceipt: boolean;
    description: string;
    vendor: string | null;
    amount: number | null;
    lineItemsTotal: number | null;
    currency: string | null;
    date: string | null;
    unreadable: string[];
}

export interface ExtractedReceiptData {
    description: string;
    amount: number;
    date: string | null;
    checks: ExtractionCheck[];
    model: string;
    escalated: boolean;
}

export function reviewReceipt(raw: RawReceipt, model: string, escalated = false, today = new Date()): ExtractedReceiptData {
    const checks: ExtractionCheck[] = [];
    const amount = raw.amount !== null && raw.amount > 0 ? roundMoney(raw.amount) : 0;

    if (!raw.isReceipt) checks.push({ code: "notReceipt", level: "warning" });
    if (amount === 0) checks.push({ code: "noAmount", level: "error" });
    if (amount > 0 && raw.lineItemsTotal !== null && raw.lineItemsTotal > 0 && !near(raw.lineItemsTotal, amount)) {
        checks.push({ code: "receiptTotalMismatch", level: "warning", values: { printed: amount, calculated: roundMoney(raw.lineItemsTotal) } });
    }
    const currency = (raw.currency || "PKR").toUpperCase();
    if (!["PKR", "RS", "RS.", "RUPEES"].includes(currency)) {
        checks.push({ code: "foreignCurrency", level: "warning", values: { currency } });
    }

    const date = parseIsoDate(raw.date);
    if (raw.date && !date) checks.push({ code: "invalidDate", level: "warning", values: { value: raw.date } });
    if (date) {
        const days = (new Date(`${date}T00:00:00Z`).getTime() - today.getTime()) / 86_400_000;
        if (days > 1) checks.push({ code: "futureDate", level: "warning", values: { value: date } });
        if (days < -400) checks.push({ code: "oldDate", level: "warning", values: { value: date } });
    }

    const unreadable = raw.unreadable.map((u) => u.trim()).filter(Boolean);
    if (unreadable.length > 0) checks.push({ code: "unreadable", level: "warning", values: { fields: unreadable.join(", ") } });

    const vendor = cleanText(raw.vendor);
    const description = cleanText(raw.description) || vendor || "";
    return {
        description: description.slice(0, 120),
        amount,
        date,
        checks,
        model,
        escalated,
    };
}
