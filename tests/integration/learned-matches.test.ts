import { beforeEach, describe, expect, it } from "vitest";
import { confirmCustomerPO } from "@/actions/po-automation";
import { deleteProductAlias, getLearnedMatches } from "@/actions/learned-matches";
import { matchCustomer } from "@/lib/ai/customer-match";
import { loadCustomerAliases, suggestProducts } from "@/lib/ai/learned-matches";
import { hasTestDatabase, prisma, resetDatabase } from "./db";

describe.skipIf(!hasTestDatabase)("learning from confirmed purchase orders", () => {
    let customerId: string;

    beforeEach(async () => {
        await resetDatabase();
        await prisma.company.create({ data: { id: "test-co", name: "Test Co", isDefault: true } });
        customerId = (await prisma.customer.create({ data: { name: "Bluebird Apparel" } })).id;
        await prisma.product.createMany({
            data: [
                { id: "p825", code: "SC-825", name: "Stripe White", basePrice: 12.5 },
                { id: "p830", code: "SC-830", name: "Super Clear", basePrice: 15 },
            ],
        });
    });

    const confirmAiPO = (items: Parameters<typeof confirmCustomerPO>[0]["items"], printedCustomerName = "B.B. Apparel Karachi") =>
        confirmCustomerPO({ customerId, poNumber: `PO-${Math.random()}`, date: "2026-10-01", printedCustomerName, items });

    it("links products, remembers the printed name and the customer's item text", async () => {
        const result = await confirmAiPO([
            { description: "Stripe bag white 12x18", quantity: 100, rate: 12.5, productId: "p825", suggestedProductId: null, sourceDescription: "STRIPE WHT 12/18", sourceProductCode: "ART-77" },
            { description: "Loose bags", quantity: 10, rate: 1 },
        ]);
        expect(result.success, result.error).toBe(true);

        const items = await prisma.customerPurchaseOrderItem.findMany({ orderBy: { description: "asc" } });
        expect(items.map((i) => i.productId)).toEqual([null, "p825"]);

        // Next PO from the same customer: name and both keys of the line are known
        const customers = await prisma.customer.findMany();
        expect(matchCustomer({ name: "B.B. Apparel, Karachi" }, customers, await loadCustomerAliases())).toMatchObject({ id: customerId, reason: "learned" });
        const suggestions = await suggestProducts(customerId, [
            { description: "Stripe Wht 12/18" },
            { description: "different words", productCode: "art-77" },
            { description: "Something new" },
        ]);
        expect(suggestions).toEqual([{ productId: "p825", reason: "learned" }, { productId: "p825", reason: "learned" }, null]);
    });

    it("does not store the customer's own name, and counts repeat confirmations", async () => {
        const line = { description: "Super Clear 14x20", quantity: 5, rate: 15, productId: "p830", sourceDescription: "Clear 14 x 20" };
        await confirmAiPO([line], "Bluebird Apparel (Pvt) Ltd");
        await confirmAiPO([line], "Bluebird Apparel (Pvt) Ltd");
        expect(await prisma.customerAlias.count()).toBe(0);
        const aliases = await prisma.productAlias.findMany();
        expect(aliases).toHaveLength(1);
        expect(aliases[0]).toMatchObject({ normalizedText: "clear 14 x 20", text: "Clear 14 x 20", timesConfirmed: 2 });
    });

    it("forgets a suggestion staff removed and follows a correction", async () => {
        const base = { description: "Stripe", quantity: 1, rate: 1, sourceDescription: "Stripe 9MM" };
        await confirmAiPO([{ ...base, productId: "p825" }]);
        await confirmAiPO([{ ...base, productId: "p830", suggestedProductId: "p825" }]);
        expect((await suggestProducts(customerId, [{ description: "Stripe 9MM" }]))[0]).toEqual({ productId: "p830", reason: "learned" });

        await confirmAiPO([{ ...base, productId: null, suggestedProductId: "p830" }]);
        expect(await prisma.productAlias.count()).toBe(0);
    });

    it("learns nothing from hand-typed POs and ignores unknown product ids", async () => {
        const result = await confirmCustomerPO({ customerId, items: [{ description: "Bags", quantity: 1, rate: 1, productId: "missing" }] });
        expect(result.success, result.error).toBe(true);
        expect((await prisma.customerPurchaseOrderItem.findFirst())?.productId).toBeNull();
        expect(await prisma.productAlias.count()).toBe(0);
        expect(await prisma.customerAlias.count()).toBe(0);
    });

    it("lists and forgets learned matches for Settings", async () => {
        await confirmAiPO([{ description: "x", quantity: 1, rate: 1, productId: "p825", sourceDescription: "Stripe 9MM" }]);
        const learned = (await getLearnedMatches()).data!;
        expect(learned.customerAliases.map((a) => a.customer.name)).toEqual(["Bluebird Apparel"]);
        expect(learned.productAliases.map((a) => a.product.code)).toEqual(["SC-825"]);
        expect((await deleteProductAlias(learned.productAliases[0].id)).success).toBe(true);
        expect(await prisma.productAlias.count()).toBe(0);
    });
});
