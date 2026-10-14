import { describe, expect, it } from "vitest";
import {
    countErrors,
    looksLikeTaxId,
    normalizeTaxId,
    parseIsoDate,
    reviewPO,
    reviewReceipt,
    type RawPO,
    type RawReceipt,
} from "@/lib/ai/extraction-checks";

function rawPO(overrides: Partial<RawPO> = {}): RawPO {
    return {
        documentType: "purchase_order",
        poNumber: " PO-4101 ",
        date: "2026-10-05",
        customer: {
            name: "Bluebird Apparel",
            nameUrdu: null,
            phone: "0300-1234567",
            email: "Orders@Bluebird.example",
            address: null,
            ntn: "NTN: 1234567-8",
            gstNumber: null,
        },
        extraColumns: ["Size", "Remarks"],
        items: [
            {
                description: "Stripe White",
                productCode: "SC-825",
                quantity: 2000,
                unit: "Pcs",
                rate: 12.5,
                gstRate: 18,
                amount: 25000,
                extraValues: [{ column: "Size", value: "12x18" }],
            },
            {
                description: "Super  Clear\n14x20",
                productCode: null,
                quantity: 1500,
                unit: null,
                rate: 15,
                gstRate: 18,
                amount: 22500,
                extraValues: [{ column: "Size", value: "14x20" }, { column: "Remarks", value: "  " }],
            },
        ],
        lastSerialNumber: 2,
        printedTaxTotal: 8550,
        printedGrandTotal: 56050,
        paymentTerms: "60 days",
        deliveryDate: null,
        notes: null,
        unreadable: [],
        ...overrides,
    };
}

describe("reviewPO", () => {
    it("passes a consistent PO and normalizes its fields", () => {
        const po = reviewPO(rawPO(), "gemini-test");
        expect(po.checks).toEqual([]);
        expect(po.poNumber).toBe("PO-4101");
        expect(po.customer.ntn).toBe("1234567-8");
        expect(po.customer.email).toBe("orders@bluebird.example");
        expect(po.items[1].description).toBe("Super Clear 14x20");
        expect(po.totalAmount).toBe(56050);
        expect(po.model).toBe("gemini-test");
    });

    it("gives every line every extra column", () => {
        const po = reviewPO(rawPO(), "m");
        expect(po.items[0].customAttributes).toEqual({ Size: "12x18", Remarks: null });
        expect(po.items[1].customAttributes).toEqual({ Size: "14x20", Remarks: null });
    });

    it("flags a line whose amount is not quantity × rate", () => {
        const raw = rawPO();
        raw.items[0].amount = 2500;
        const po = reviewPO(raw, "m");
        expect(po.checks).toContainEqual({ code: "lineMath", level: "error", line: 1, values: { printed: 2500, expected: 25000 } });
    });

    it("accepts a line amount printed with GST included", () => {
        const raw = rawPO();
        raw.items[0].amount = 29500;
        expect(countErrors(reviewPO(raw, "m").checks)).toBe(0);
    });

    it("tolerates rounding but not real differences in the grand total", () => {
        expect(countErrors(reviewPO(rawPO({ printedGrandTotal: 56050.4 }), "m").checks)).toBe(0);
        expect(countErrors(reviewPO(rawPO({ printedGrandTotal: 47500 }), "m").checks)).toBe(0); // total before tax
        const po = reviewPO(rawPO({ printedGrandTotal: 61050 }), "m");
        expect(po.checks.map((c) => c.code)).toContain("totalMismatch");
    });

    it("detects missing rows from the serial numbers", () => {
        const po = reviewPO(rawPO({ lastSerialNumber: 3 }), "m");
        expect(po.checks).toContainEqual({ code: "rowCount", level: "error", values: { printed: 3, found: 2 } });
    });

    it("reports missing essentials as errors and doubtful fields as warnings", () => {
        const raw = rawPO({ date: "2026-02-30", documentType: "quotation", unreadable: ["line 2 rate"] });
        raw.customer.name = "  ";
        raw.customer.gstNumber = "12-34";
        raw.items[1].quantity = 0;
        const po = reviewPO(raw, "m");
        const byCode = Object.fromEntries(po.checks.map((c) => [c.code, c.level]));
        expect(byCode).toMatchObject({
            noCustomerName: "error",
            zeroQuantity: "error",
            invalidDate: "warning",
            notPurchaseOrder: "warning",
            unreadable: "warning",
            taxIdFormat: "warning",
        });
        expect(po.date).toBeNull();
    });

    it("drops blank rows and errors when nothing is left", () => {
        const raw = rawPO({ lastSerialNumber: null, printedGrandTotal: null });
        raw.items = [{ ...raw.items[0], description: " " }];
        const po = reviewPO(raw, "m");
        expect(po.items).toEqual([]);
        expect(po.checks.map((c) => c.code)).toEqual(["noItems"]);
    });
});

describe("field helpers", () => {
    it("accepts only real ISO dates", () => {
        expect(parseIsoDate("2026-10-05")).toBe("2026-10-05");
        expect(parseIsoDate("2026-02-29")).toBeNull();
        expect(parseIsoDate("05/10/2026")).toBeNull();
        expect(parseIsoDate(null)).toBeNull();
    });

    it("normalizes and validates tax numbers", () => {
        expect(normalizeTaxId(" NTN 1234567-8 ")).toBe("1234567-8");
        expect(normalizeTaxId("—")).toBeNull();
        expect(looksLikeTaxId("1234567-8")).toBe(true);
        expect(looksLikeTaxId("12345678")).toBe(true);
        expect(looksLikeTaxId("3520212345671")).toBe(true);
        expect(looksLikeTaxId("12-34")).toBe(false);
    });
});

describe("reviewReceipt", () => {
    const today = new Date("2026-10-14T12:00:00Z");
    const raw = (overrides: Partial<RawReceipt> = {}): RawReceipt => ({
        isReceipt: true,
        description: "Diesel - 50 litres",
        vendor: "PSO Korangi",
        amount: 14250,
        lineItemsTotal: 14250,
        currency: "PKR",
        date: "2026-10-12",
        unreadable: [],
        ...overrides,
    });

    it("passes a clear receipt", () => {
        const receipt = reviewReceipt(raw(), "m", false, today);
        expect(receipt).toMatchObject({ amount: 14250, date: "2026-10-12", checks: [] });
    });

    it("errors when no total was read so the stronger model gets a turn", () => {
        const receipt = reviewReceipt(raw({ amount: null }), "m", false, today);
        expect(countErrors(receipt.checks)).toBe(1);
        expect(receipt.amount).toBe(0);
    });

    it("warns about doubtful dates, totals and currency", () => {
        const codes = (r: RawReceipt) => reviewReceipt(r, "m", false, today).checks.map((c) => c.code);
        expect(codes(raw({ date: "2026-11-30" }))).toEqual(["futureDate"]);
        expect(codes(raw({ date: "2025-01-01" }))).toEqual(["oldDate"]);
        expect(codes(raw({ lineItemsTotal: 12000 }))).toEqual(["receiptTotalMismatch"]);
        expect(codes(raw({ currency: "USD" }))).toEqual(["foreignCurrency"]);
        expect(codes(raw({ currency: "Rs" }))).toEqual([]);
    });

    it("falls back to the vendor name when no description was read", () => {
        expect(reviewReceipt(raw({ description: "" }), "m", false, today).description).toBe("PSO Korangi");
    });
});
