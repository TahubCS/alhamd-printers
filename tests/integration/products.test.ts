import { beforeEach, describe, expect, it } from "vitest";
import { getProductCatalog, getProducts, saveProduct, setProductActive } from "@/actions/product";
import { hasTestDatabase, resetDatabase } from "./db";

describe.skipIf(!hasTestDatabase)("products", () => {
    beforeEach(resetDatabase);

    it("normalises codes, rejects duplicates and hides archived products from pickers", async () => {
        const created = await saveProduct(null, { code: "sc-825", name: "Stripe White", basePrice: "12.5" });
        expect(created.success).toBe(true);

        const duplicate = await saveProduct(null, { code: "SC-825", name: "Copy", basePrice: 1 });
        expect(duplicate.success).toBe(false);
        expect(duplicate.error).toMatch(/already used/);

        const negative = await saveProduct(null, { code: "X-1", name: "Bad", basePrice: -1 });
        expect(negative.success).toBe(false);

        const catalog = (await getProductCatalog()).data!;
        expect(catalog[0]).toMatchObject({ code: "SC-825", basePrice: 12.5, buttonPrice: 0, isActive: true });

        await setProductActive(created.data!.id, false);
        expect((await getProducts()).data).toHaveLength(0);
        expect((await getProductCatalog()).data).toHaveLength(1);
    });

    it("updates a product while keeping its own code", async () => {
        const { data } = await saveProduct(null, { code: "P-1", name: "Plain", basePrice: 5 });
        const updated = await saveProduct(data!.id, { code: "P-1", name: "Plain Large", basePrice: 6, withPrint: true });
        expect(updated.success).toBe(true);
        expect((await getProductCatalog()).data![0]).toMatchObject({ name: "Plain Large", basePrice: 6, withPrint: true });
    });
});
