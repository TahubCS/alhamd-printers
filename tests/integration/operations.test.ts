import { beforeEach, describe, expect, it } from "vitest";
import { adjustStock, createRawMaterial } from "@/actions/inventory";
import { createWageEntry, createWorker, deleteWageEntry } from "@/actions/wage";
import { hasTestDatabase, prisma, resetDatabase } from "./db";

describe.skipIf(!hasTestDatabase)("inventory", () => {
    beforeEach(resetDatabase);

    it("tracks stock in and out and refuses to go below zero", async () => {
        const created = await createRawMaterial({ name: "0.9mm Super Clear", type: "ROLL", quantity: 10, minimumStockLevel: 2 });
        const id = created.data!.id;

        expect((await adjustStock(id, 5, "IN")).data?.quantity).toBe(15);
        expect((await adjustStock(id, 4, "OUT")).data?.quantity).toBe(11);

        const tooMuch = await adjustStock(id, 50, "OUT");
        expect(tooMuch.success).toBe(false);
        expect(tooMuch.error).toMatch(/only 11 available/);

        const material = await prisma.rawMaterial.findUniqueOrThrow({ where: { id }, include: { transactions: true } });
        expect(Number(material.quantity)).toBe(11);
        // Initial stock + IN + OUT; the rejected withdrawal left no transaction behind
        expect(material.transactions).toHaveLength(3);
    });

    it("applies signed adjustments", async () => {
        const created = await createRawMaterial({ name: "Hangers", type: "HANGER", quantity: 100, minimumStockLevel: 10 });
        expect((await adjustStock(created.data!.id, -7, "ADJUSTMENT")).data?.quantity).toBe(93);
        expect((await adjustStock(created.data!.id, 0, "IN")).success).toBe(false);
    });
});

describe.skipIf(!hasTestDatabase)("wages", () => {
    beforeEach(resetDatabase);

    it("keeps the worker balance in step with entries and deletions", async () => {
        const worker = (await createWorker({ name: "Test Worker" })).data!;

        await createWageEntry({ workerId: worker.id, type: "ADVANCE", amount: 5000, date: new Date() });
        const payment = await createWageEntry({ workerId: worker.id, type: "PAYMENT", amount: 3000, date: new Date() });
        expect(payment.data?.newBalance).toBe(-2000);

        expect((await deleteWageEntry(payment.data!.id)).success).toBe(true);
        const after = await prisma.worker.findUniqueOrThrow({ where: { id: worker.id } });
        expect(Number(after.balance)).toBe(-5000);
    });

    it("rejects non-positive amounts", async () => {
        const worker = (await createWorker({ name: "Test Worker" })).data!;
        const result = await createWageEntry({ workerId: worker.id, type: "PAYMENT", amount: 0, date: new Date() });
        expect(result.success).toBe(false);
    });
});
