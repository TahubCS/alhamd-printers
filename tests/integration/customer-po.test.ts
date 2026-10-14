import { beforeEach, describe, expect, it } from "vitest";
import { confirmCustomerPO } from "@/actions/po-automation";
import { getCustomerPOById } from "@/actions/po";
import { createInvoice } from "@/actions/invoice";
import { hasTestDatabase, prisma, resetDatabase } from "./db";

describe.skipIf(!hasTestDatabase)("customer purchase orders", () => {
    beforeEach(async () => {
        await resetDatabase();
        await prisma.company.create({ data: { id: "test-co", name: "Test Co", isDefault: true } });
    });

    it("computes amounts on the server, keeps terms and creates the customer", async () => {
        const result = await confirmCustomerPO({
            newCustomerName: "Fresh Garments",
            newCustomerEmail: "",
            poNumber: "PO-1",
            date: "2026-10-01",
            paymentTerms: "45 days",
            notes: "Deliver in two lots",
            items: [
                { description: "Stripe bags", quantity: 1500, rate: 12.5, amount: 1, gstRate: 18 },
                { description: "  ", quantity: 1, rate: 1, amount: 1 },
            ],
        });
        expect(result.success, result.error).toBe(true);

        const po = (await getCustomerPOById(result.data!.id)).data!;
        expect(po.totalAmount).toBe(22125);
        expect(po.items).toHaveLength(1);
        expect(po.items[0]).toMatchObject({ amount: 18750, delivered: 0 });
        expect(po.notes).toBe("Payment terms: 45 days\nDeliver in two lots");
        expect(po.customer?.name).toBe("Fresh Garments");
        expect(po.customer?.email).toBeNull();
    });

    it("reuses an existing customer with the same name and rejects empty orders", async () => {
        const existing = await prisma.customer.create({ data: { name: "Crescent Garments" } });
        const result = await confirmCustomerPO({ newCustomerName: "crescent garments", items: [{ description: "Bags", quantity: 10, rate: 2 }] });
        expect((await getCustomerPOById(result.data!.id)).data!.customerId).toBe(existing.id);

        const empty = await confirmCustomerPO({ newCustomerName: "X", items: [] });
        expect(empty.success).toBe(false);
        expect(await prisma.customer.count()).toBe(1);
    });

    it("matches the invoice raised from it, closing the PO", async () => {
        const created = await confirmCustomerPO({
            newCustomerName: "Match Co",
            items: [{ description: "Bags", quantity: 1000, rate: 10, gstRate: 18 }],
        });
        const po = (await getCustomerPOById(created.data!.id)).data!;
        await createInvoice({
            companyId: "test-co", customerId: po.customerId!, date: new Date(), creditDays: 30, customerPurchaseOrderId: po.id,
            items: po.items.map((i) => ({ description: i.description, quantity: i.quantity, rate: i.rate, gstRate: i.gstRate })),
        });
        expect((await getCustomerPOById(po.id)).data!.status).toBe("CLOSED");
    });
});
