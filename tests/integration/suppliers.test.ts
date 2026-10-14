import { beforeEach, describe, expect, it } from "vitest";
import { createRawMaterial } from "@/actions/inventory";
import {
    cancelPurchaseOrder,
    createPurchaseOrder,
    getPurchaseOrderById,
    getSupplierById,
    receivePurchaseOrder,
    recordSupplierPayment,
    saveSupplier,
} from "@/actions/supplier";
import { hasTestDatabase, prisma, resetDatabase } from "./db";

async function setup() {
    const supplier = (await saveSupplier(null, { name: "Polymer Traders" })).data!;
    const roll = (await createRawMaterial({ name: "0.9mm Super Clear", type: "ROLL", quantity: 5, minimumStockLevel: 2 })).data!;
    const po = await createPurchaseOrder({
        supplierId: supplier.id,
        date: "2026-10-01",
        items: [
            { description: "PVC roll 0.9mm", quantity: 10, rate: 1500, materialId: roll.id },
            { description: "Packing tape", quantity: 20, rate: 75.5 },
        ],
    });
    expect(po.success, po.error).toBe(true);
    const detail = (await getPurchaseOrderById(po.data!.id)).data!;
    return { supplier, roll, poId: po.data!.id, items: detail.items, total: detail.total };
}

describe.skipIf(!hasTestDatabase)("supplier purchases", () => {
    beforeEach(resetDatabase);

    it("computes the PO total on the server", async () => {
        const { total } = await setup();
        expect(total).toBe(16510);
    });

    it("adds received goods to stock and to the supplier balance, partially then fully", async () => {
        const { supplier, roll, poId, items } = await setup();
        const [rolls, tape] = items;

        const partial = await receivePurchaseOrder(poId, [{ itemId: rolls.id, quantity: 4 }]);
        expect(partial).toMatchObject({ success: true, data: { status: "PARTIAL" } });
        expect(Number((await prisma.rawMaterial.findUniqueOrThrow({ where: { id: roll.id } })).quantity)).toBe(9);
        expect((await getSupplierById(supplier.id)).data!.balance).toBe(6000);

        const overflow = await receivePurchaseOrder(poId, [{ itemId: rolls.id, quantity: 7 }]);
        expect(overflow.success).toBe(false);
        expect(overflow.error).toMatch(/only 6 left/);

        const rest = await receivePurchaseOrder(poId, [{ itemId: rolls.id, quantity: 6 }, { itemId: tape.id, quantity: 20 }]);
        expect(rest).toMatchObject({ success: true, data: { status: "RECEIVED" } });
        expect(Number((await prisma.rawMaterial.findUniqueOrThrow({ where: { id: roll.id } })).quantity)).toBe(15);
        expect((await getSupplierById(supplier.id)).data!.balance).toBe(16510);

        const tx = await prisma.inventoryTransaction.findMany({ where: { purchaseOrderId: poId } });
        expect(tx.map((t) => Number(t.quantity)).sort()).toEqual([4, 6]);

        expect((await receivePurchaseOrder(poId, [{ itemId: tape.id, quantity: 1 }])).success).toBe(false);
    });

    it("reduces the balance with payments", async () => {
        const { supplier, poId, items } = await setup();
        await receivePurchaseOrder(poId, [{ itemId: items[0].id, quantity: 10 }]);
        const payment = await recordSupplierPayment({ supplierId: supplier.id, amount: 5000, method: "CASH", date: "2026-10-05" });
        expect(payment.success).toBe(true);
        const detail = (await getSupplierById(supplier.id)).data!;
        expect(detail.balance).toBe(10000);
        expect(detail.totals).toEqual({ purchased: 15000, paid: 5000 });
        expect((await recordSupplierPayment({ supplierId: supplier.id, amount: 0, method: "CASH", date: "2026-10-05" })).success).toBe(false);
    });

    it("cancels only untouched orders", async () => {
        const first = await setup();
        await receivePurchaseOrder(first.poId, [{ itemId: first.items[1].id, quantity: 1 }]);
        expect((await cancelPurchaseOrder(first.poId)).success).toBe(false);

        const second = await createPurchaseOrder({ supplierId: first.supplier.id, date: "2026-10-02", items: [{ description: "Buttons", quantity: 100, rate: 1 }] });
        expect((await cancelPurchaseOrder(second.data!.id)).success).toBe(true);
        expect((await receivePurchaseOrder(second.data!.id, [{ itemId: "x", quantity: 1 }])).success).toBe(false);
    });
});
