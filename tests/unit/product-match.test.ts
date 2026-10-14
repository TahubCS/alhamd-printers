import { describe, expect, it } from "vitest";
import { lineKeys, normalizeText, suggestProduct, type ProductCandidate } from "@/lib/ai/product-match";

const products: ProductCandidate[] = [
    { id: "p825", code: "SC-825", name: "Stripe White" },
    { id: "p830", code: "SC-830", name: "Super Clear" },
    { id: "p831", code: "SC-831", name: "Super Clear Premium" },
    { id: "p210", code: "PR-210", name: "Printed Shirt Bag" },
];

describe("lineKeys", () => {
    it("keys a line by the customer's code first, then the description", () => {
        expect(lineKeys({ description: "Stripe Wht. 12/18", productCode: "ART-77" })).toEqual(["code:art 77", "stripe wht 12 18"]);
        expect(lineKeys({ description: "  " })).toEqual([]);
        expect(normalizeText("Shirt-Bag (12x16)")).toBe("shirt bag 12x16");
    });
});

describe("suggestProduct", () => {
    it("prefers what this customer confirmed before", () => {
        const aliases = [{ normalizedText: "stripe wht 12 18", productId: "p825" }];
        expect(suggestProduct({ description: "STRIPE WHT 12/18" }, products, aliases)).toEqual({ productId: "p825", reason: "learned" });
    });

    it("uses the customer's item code when that was learned", () => {
        const aliases = [{ normalizedText: "code:art 77", productId: "p210" }];
        expect(suggestProduct({ description: "Something reworded", productCode: "ART-77" }, products, aliases)).toEqual({ productId: "p210", reason: "learned" });
    });

    it("ignores a learned product that is no longer active", () => {
        const aliases = [{ normalizedText: "old bag", productId: "archived" }];
        expect(suggestProduct({ description: "Old Bag" }, products, aliases)).toBeNull();
    });

    it("matches our product code printed on the line", () => {
        expect(suggestProduct({ description: "Bags", productCode: "sc 830" }, products)).toEqual({ productId: "p830", reason: "code" });
        expect(suggestProduct({ description: "Bag SC-825 9MM" }, products)).toEqual({ productId: "p825", reason: "code" });
    });

    it("matches a product name, choosing the most specific", () => {
        expect(suggestProduct({ description: "printed shirt bag" }, products)).toEqual({ productId: "p210", reason: "name" });
        expect(suggestProduct({ description: "Super Clear 14x20 1MM" }, products)).toEqual({ productId: "p830", reason: "name" });
        expect(suggestProduct({ description: "Super Clear Premium 14x20" }, products)).toEqual({ productId: "p831", reason: "name" });
    });

    it("leaves uncertain lines unlinked", () => {
        expect(suggestProduct({ description: "Clear bags" }, products)).toBeNull();
        expect(suggestProduct({ description: "Stripe" }, products)).toBeNull();
    });
});
