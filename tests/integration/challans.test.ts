import { beforeEach, describe, expect, it } from "vitest";
import { createChallan, deleteChallan, getPODeliveryStatus } from "@/actions/challan";
import { deleteCustomer } from "@/actions/customer";
import { createCustomerRecord, hasTestDatabase, prisma, resetDatabase } from "./db";

async function poWithLines(customerId: string) {
    return prisma.customerPurchaseOrder.create({
        data: {
            customerId,
            poNumber: "PO-77",
            status: "OPEN",
            items: { create: [{ description: "Stripe bags", quantity: 1000 }, { description: "Hangers", quantity: 200 }] },
        },
        include: { items: true },
    });
}

describe.skipIf(!hasTestDatabase)("delivery challans", () => {
    beforeEach(resetDatabase);

    it("tracks partial deliveries against a PO and blocks over-delivery", async () => {
        const customer = await createCustomerRecord();
        const po = await poWithLines(customer.id);
        const [bags, hangers] = po.items;

        const first = await createChallan({
            customerId: customer.id, date: "2026-10-01", customerPurchaseOrderId: po.id, vehicleNo: "KHI-1",
            items: [{ description: bags.description, quantity: 600, customerPurchaseOrderItemId: bags.id }],
        });
        expect(first.success, first.error).toBe(true);

        let status = (await getPODeliveryStatus(po.id)).data!;
        expect(status.lines.find((l) => l.id === bags.id)).toMatchObject({ delivered: 600, remaining: 400 });
        expect(status.lines.find((l) => l.id === hangers.id)).toMatchObject({ delivered: 0, remaining: 200 });

        const tooMany = await createChallan({
            customerId: customer.id, date: "2026-10-02", customerPurchaseOrderId: po.id,
            items: [{ description: bags.description, quantity: 401, customerPurchaseOrderItemId: bags.id }],
        });
        expect(tooMany.success).toBe(false);
        expect(tooMany.error).toMatch(/only 400 left/);

        expect((await deleteChallan(first.data!.id)).success).toBe(true);
        status = (await getPODeliveryStatus(po.id)).data!;
        expect(status.lines.find((l) => l.id === bags.id)?.remaining).toBe(1000);
    });

    it("rejects a PO that belongs to another customer and invalid quantities", async () => {
        const owner = await createCustomerRecord("Owner");
        const other = await createCustomerRecord("Other");
        const po = await poWithLines(owner.id);

        const wrongCustomer = await createChallan({
            customerId: other.id, date: "2026-10-01", customerPurchaseOrderId: po.id,
            items: [{ description: "x", quantity: 1, customerPurchaseOrderItemId: po.items[0].id }],
        });
        expect(wrongCustomer.success).toBe(false);

        const fractional = await createChallan({ customerId: owner.id, date: "2026-10-01", items: [{ description: "Loose", quantity: 1.5 }] });
        expect(fractional.success).toBe(false);
        const empty = await createChallan({ customerId: owner.id, date: "2026-10-01", items: [] });
        expect(empty.success).toBe(false);
    });

    it("numbers challans and stops a customer with challans from being deleted", async () => {
        const customer = await createCustomerRecord();
        const result = await createChallan({ customerId: customer.id, date: "2026-10-01", items: [{ description: "Samples", quantity: 50, unit: "Packets" }] });
        expect(result.data?.challanNo).toBe(1);

        const deletion = await deleteCustomer(customer.id);
        expect(deletion.success).toBe(false);
        expect(deletion.error).toMatch(/delivery challan/);
    });
});
