import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RawPO } from "@/lib/ai/extraction-checks";

const readDocument = vi.fn();
let escalation: { model: string; strong: boolean } | null = { model: "strong-model", strong: true };

vi.mock("@/lib/ai/gemini", () => ({
    readDocument: (...args: unknown[]) => readDocument(...args),
    firstPass: () => ({ model: "cheap-model", strong: false }),
    escalationPass: () => escalation,
    nullable: (schema: object) => ({ anyOf: [schema, { type: "null" }] }),
}));

const { extractDataFromPO } = await import("@/lib/ai/po-extractor");

function raw(amount: number): RawPO {
    return {
        documentType: "purchase_order",
        poNumber: "PO-1",
        date: "2026-10-05",
        customer: { name: "Bluebird Apparel", nameUrdu: null, phone: null, email: null, address: null, ntn: null, gstNumber: null },
        extraColumns: [],
        items: [{ description: "Stripe White", productCode: null, quantity: 100, unit: null, rate: 10, gstRate: null, amount, extraValues: [] }],
        lastSerialNumber: 1,
        printedTaxTotal: null,
        printedGrandTotal: null,
        paymentTerms: null,
        deliveryDate: null,
        notes: null,
        unreadable: [],
    };
}

describe("extractDataFromPO", () => {
    beforeEach(() => {
        readDocument.mockReset();
        escalation = { model: "strong-model", strong: true };
    });

    it("stops after the cheap model when every check passes", async () => {
        readDocument.mockResolvedValueOnce(raw(1000));
        const result = await extractDataFromPO("data", "application/pdf", ["Al-Hamd Printers"]);
        expect(readDocument).toHaveBeenCalledTimes(1);
        expect(result).toMatchObject({ model: "cheap-model", escalated: false, checks: [] });
        // Our own names reach the prompt so the model never takes us for the customer
        expect(readDocument.mock.calls[0][0].systemInstruction).toContain('"Al-Hamd Printers"');
    });

    it("re-reads with the stronger model when a check fails", async () => {
        readDocument.mockResolvedValueOnce(raw(100)).mockResolvedValueOnce(raw(1000));
        const result = await extractDataFromPO("data", "image/jpeg");
        expect(readDocument).toHaveBeenCalledTimes(2);
        expect(readDocument.mock.calls[1][0].pass).toEqual({ model: "strong-model", strong: true });
        expect(result).toMatchObject({ model: "strong-model", escalated: true, checks: [] });
    });

    it("keeps the first reading if the stronger one is worse or fails", async () => {
        const first = raw(100);
        const worse = { ...raw(100), lastSerialNumber: 4 };
        readDocument.mockResolvedValueOnce(first).mockResolvedValueOnce(worse);
        expect(await extractDataFromPO("data", "image/png")).toMatchObject({ model: "cheap-model" });

        readDocument.mockResolvedValueOnce(first).mockRejectedValueOnce(new Error("quota"));
        expect(await extractDataFromPO("data", "image/png")).toMatchObject({ model: "cheap-model" });
    });

    it("does not escalate when no stronger model is configured", async () => {
        escalation = null;
        readDocument.mockResolvedValueOnce(raw(100));
        const result = await extractDataFromPO("data", "image/png");
        expect(readDocument).toHaveBeenCalledTimes(1);
        expect(result?.checks.map((c) => c.code)).toEqual(["lineMath"]);
    });

    it("returns null when no reading could be made", async () => {
        readDocument.mockRejectedValue(new Error("network"));
        expect(await extractDataFromPO("data", "image/png")).toBeNull();
    });
});
