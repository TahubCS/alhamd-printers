import type { Prisma } from "@prisma/client";
import { deriveInvoiceStatuses, derivePOStatus } from "@/lib/finance";

/**
 * Recompute the stored status of every invoice for a customer from their
 * current balance. Call inside the same transaction as any change to the
 * customer's balance, invoices, or bad-debt flag.
 */
export async function syncInvoiceStatuses(tx: Prisma.TransactionClient, customerId: string) {
    const customer = await tx.customer.findUnique({
        where: { id: customerId },
        select: {
            balance: true,
            isBadDebt: true,
            invoices: { select: { id: true, date: true, dueDate: true, total: true, status: true } },
        },
    });
    if (!customer) return;

    const statuses = deriveInvoiceStatuses(
        customer.invoices.map((inv) => ({ ...inv, total: Number(inv.total) })),
        Number(customer.balance),
        { isBadDebt: customer.isBadDebt }
    );

    for (const invoice of customer.invoices) {
        const next = statuses.get(invoice.id);
        if (next && next !== invoice.status) {
            await tx.invoice.update({ where: { id: invoice.id }, data: { status: next } });
        }
    }
}

/** Recompute a customer PO's status from the invoices currently linked to it. */
export async function syncPOStatus(tx: Prisma.TransactionClient, purchaseOrderId: string) {
    const po = await tx.customerPurchaseOrder.findUnique({
        where: { id: purchaseOrderId },
        select: { totalAmount: true, invoices: { select: { total: true } } },
    });
    if (!po) return;

    const invoiced = po.invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    await tx.customerPurchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: derivePOStatus(invoiced, Number(po.totalAmount)) },
    });
}
