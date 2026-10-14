import { beforeEach, describe, expect, it } from "vitest";
import { createInvoice, deleteInvoice } from "@/actions/invoice";
import { recordPayment, updateChequeStatus } from "@/actions/payment";
import { createCustomer, updateCustomer } from "@/actions/customer";
import { createCompany, createCustomerRecord, hasTestDatabase, prisma, resetDatabase } from "./db";

const today = new Date();

async function invoiceFor(customerId: string, lines: { quantity: number; rate: number; gstRate?: number; amount?: number }[], extra: Partial<Parameters<typeof createInvoice>[0]> = {}) {
    const result = await createInvoice({
        companyId: "test-co",
        customerId,
        date: today,
        creditDays: 30,
        items: lines.map((line, i) => ({ description: `Line ${i + 1}`, ...line })),
        ...extra,
    });
    expect(result.success, result.error).toBe(true);
    return result.data!;
}

async function balanceOf(customerId: string) {
    const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
    return Number(customer.balance);
}

describe.skipIf(!hasTestDatabase)("customer ledger", () => {
    beforeEach(async () => {
        await resetDatabase();
        await createCompany();
    });

    it("recomputes invoice totals on the server and debits the customer", async () => {
        const customer = await createCustomerRecord();
        // The client-sent amount is deliberately wrong and must be ignored
        const invoice = await invoiceFor(customer.id, [
            { quantity: 1000, rate: 12.5, gstRate: 18, amount: 1 },
            { quantity: 200, rate: 10 },
        ]);

        expect(invoice.subtotal).toBe(14500);
        expect(invoice.taxTotal).toBe(2250);
        expect(invoice.total).toBe(16750);
        expect(await balanceOf(customer.id)).toBe(16750);

        const ledger = await prisma.ledgerEntry.findMany({ where: { customerId: customer.id } });
        expect(ledger).toHaveLength(1);
        expect(Number(ledger[0].debit)).toBe(16750);
        expect(Number(ledger[0].balance)).toBe(16750);
    });

    it("rejects invoices without valid lines", async () => {
        const customer = await createCustomerRecord();
        const empty = await createInvoice({ companyId: "test-co", customerId: customer.id, date: today, creditDays: 0, items: [] });
        expect(empty.success).toBe(false);
        const negative = await createInvoice({
            companyId: "test-co", customerId: customer.id, date: today, creditDays: 0,
            items: [{ description: "Bags", quantity: -5, rate: 10 }],
        });
        expect(negative.success).toBe(false);
        expect(await balanceOf(customer.id)).toBe(0);
    });

    it("moves invoices from pending to partial to paid as payments arrive", async () => {
        const customer = await createCustomerRecord();
        const older = await invoiceFor(customer.id, [{ quantity: 1, rate: 1000 }]);
        const newer = await invoiceFor(customer.id, [{ quantity: 1, rate: 500 }]);

        await recordPayment({ customerId: customer.id, amount: 700, method: "CASH" });
        let statuses = await prisma.invoice.findMany({ orderBy: { invoiceNo: "asc" } });
        expect(statuses.map((i) => i.status)).toEqual(["PARTIAL", "PENDING"]);

        await recordPayment({ customerId: customer.id, amount: 800, method: "CASH" });
        statuses = await prisma.invoice.findMany({ orderBy: { invoiceNo: "asc" } });
        expect(statuses.map((i) => i.status)).toEqual(["PAID", "PAID"]);
        expect(await balanceOf(customer.id)).toBe(0);
        expect([older.invoiceNo, newer.invoiceNo]).toEqual([1, 2]);
    });

    it("does not lose concurrent payments", async () => {
        const customer = await createCustomerRecord();
        await invoiceFor(customer.id, [{ quantity: 1, rate: 10000 }]);

        const results = await Promise.all(
            Array.from({ length: 5 }, () => recordPayment({ customerId: customer.id, amount: 1000, method: "CASH" }))
        );
        expect(results.every((r) => r.success)).toBe(true);
        expect(await balanceOf(customer.id)).toBe(5000);
    });

    it("reverses a bounced cheque exactly once and blocks invalid transitions", async () => {
        const customer = await createCustomerRecord();
        await invoiceFor(customer.id, [{ quantity: 1, rate: 3000 }]);
        await recordPayment({
            customerId: customer.id, amount: 3000, method: "CHEQUE",
            chequeNo: "000123", bankName: "Test Bank", chequeDate: today,
        });
        expect(await balanceOf(customer.id)).toBe(0);

        const cheque = await prisma.cheque.findFirstOrThrow();
        expect((await updateChequeStatus(cheque.id, "DEPOSITED")).success).toBe(true);
        expect((await updateChequeStatus(cheque.id, "BOUNCED")).success).toBe(true);
        expect(await balanceOf(customer.id)).toBe(3000);
        expect((await prisma.invoice.findFirstOrThrow()).status).toBe("PENDING");

        const again = await updateChequeStatus(cheque.id, "BOUNCED");
        expect(again.success).toBe(false);
        expect(await balanceOf(customer.id)).toBe(3000);
    });

    it("refuses to clear a cheque that was never deposited", async () => {
        const customer = await createCustomerRecord();
        await recordPayment({
            customerId: customer.id, amount: 100, method: "CHEQUE",
            chequeNo: "1", bankName: "Bank", chequeDate: today,
        });
        const cheque = await prisma.cheque.findFirstOrThrow();
        expect((await updateChequeStatus(cheque.id, "CLEARED")).success).toBe(false);
    });

    it("keeps the ledger reconcilable when an invoice is deleted", async () => {
        const customer = await createCustomerRecord();
        const invoice = await invoiceFor(customer.id, [{ quantity: 2, rate: 750 }]);

        expect((await deleteInvoice(invoice.id)).success).toBe(true);
        expect(await balanceOf(customer.id)).toBe(0);

        const ledger = await prisma.ledgerEntry.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "asc" } });
        expect(ledger.map((e) => [Number(e.debit), Number(e.credit)])).toEqual([[1500, 0], [0, 1500]]);
        const debits = ledger.reduce((s, e) => s + Number(e.debit) - Number(e.credit), 0);
        expect(debits).toBe(await balanceOf(customer.id));
    });

    it("closes a customer PO only once its invoices cover it", async () => {
        const customer = await createCustomerRecord();
        const po = await prisma.customerPurchaseOrder.create({
            data: { customerId: customer.id, poNumber: "PO-1", totalAmount: 2000, status: "OPEN" },
        });

        await invoiceFor(customer.id, [{ quantity: 1, rate: 1000 }], { customerPurchaseOrderId: po.id });
        expect((await prisma.customerPurchaseOrder.findUniqueOrThrow({ where: { id: po.id } })).status).toBe("PARTIAL");

        await invoiceFor(customer.id, [{ quantity: 1, rate: 1000 }], { customerPurchaseOrderId: po.id });
        expect((await prisma.customerPurchaseOrder.findUniqueOrThrow({ where: { id: po.id } })).status).toBe("CLOSED");
    });

    it("allows several customers without an email and records opening balances", async () => {
        const a = await createCustomer({ name: "No Email A", email: "", openingBalance: 2500, isBadDebt: false });
        const b = await createCustomer({ name: "No Email B", email: "", openingBalance: -400, isBadDebt: false });
        expect(a.success && b.success).toBe(true);

        const ledgerB = await prisma.ledgerEntry.findFirstOrThrow({ where: { customerId: b.data!.id } });
        expect(Number(ledgerB.credit)).toBe(400);
        expect(Number(ledgerB.balance)).toBe(-400);
    });

    it("marks unpaid invoices as bad debt when the customer is flagged", async () => {
        const customer = await createCustomerRecord("Risky Traders");
        await invoiceFor(customer.id, [{ quantity: 1, rate: 900 }]);

        const result = await updateCustomer(customer.id, { name: "Risky Traders", isBadDebt: true });
        expect(result.success).toBe(true);
        expect((await prisma.invoice.findFirstOrThrow()).status).toBe("BAD_DEBT");
    });
});
