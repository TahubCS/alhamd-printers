import { describe, expect, it } from "vitest";
import {
    addDays,
    calculateDocumentTotals,
    calculateLine,
    canTransitionCheque,
    derivePOStatus,
    deriveInvoiceStatuses,
    effectiveInvoiceStatus,
    roundMoney,
    stockChange,
    wageBalanceChange,
} from "@/lib/finance";

describe("roundMoney", () => {
    it("rounds to two decimals without float drift", () => {
        expect(roundMoney(0.1 + 0.2)).toBe(0.3);
        expect(roundMoney(1.005)).toBe(1.01);
        expect(roundMoney(-2.345)).toBe(-2.34);
    });
});

describe("calculateLine / calculateDocumentTotals", () => {
    it("computes amount and GST per line", () => {
        expect(calculateLine({ quantity: 1000, rate: 12.5, gstRate: 18 })).toEqual({ amount: 12500, tax: 2250 });
        expect(calculateLine({ quantity: 3, rate: 0.333 })).toEqual({ amount: 1, tax: 0 });
    });

    it("sums subtotal, tax and total across lines", () => {
        const totals = calculateDocumentTotals([
            { quantity: 1000, rate: 12.5, gstRate: 18 },
            { quantity: 500, rate: 8, gstRate: 0 },
        ]);
        expect(totals.subtotal).toBe(16500);
        expect(totals.taxTotal).toBe(2250);
        expect(totals.total).toBe(18750);
        expect(totals.lines).toHaveLength(2);
    });

    it("handles an empty document", () => {
        expect(calculateDocumentTotals([])).toEqual({ lines: [], subtotal: 0, taxTotal: 0, total: 0 });
    });
});

describe("addDays", () => {
    it("does not mutate its input and crosses month boundaries", () => {
        const start = new Date(2026, 0, 25);
        const due = addDays(start, 10);
        expect(due.getMonth()).toBe(1);
        expect(due.getDate()).toBe(4);
        expect(start.getDate()).toBe(25);
    });
});

describe("derivePOStatus", () => {
    it("is open with nothing invoiced, partial below total, closed at or above total", () => {
        expect(derivePOStatus(0, 1000)).toBe("OPEN");
        expect(derivePOStatus(400, 1000)).toBe("PARTIAL");
        expect(derivePOStatus(1000, 1000)).toBe("CLOSED");
        expect(derivePOStatus(1000.004, 1000)).toBe("CLOSED");
    });
});

describe("deriveInvoiceStatuses", () => {
    const now = new Date("2026-06-15T00:00:00Z");
    const invoices = [
        { id: "a", date: new Date("2026-05-01"), dueDate: new Date("2026-05-31"), total: 1000 },
        { id: "b", date: new Date("2026-06-01"), dueDate: new Date("2026-07-01"), total: 500 },
        { id: "c", date: new Date("2026-06-10"), dueDate: new Date("2026-07-10"), total: 300 },
    ];

    it("marks everything paid when nothing is outstanding", () => {
        const statuses = deriveInvoiceStatuses(invoices, 0, { now });
        expect([...statuses.values()]).toEqual(["PAID", "PAID", "PAID"]);
    });

    it("allocates the outstanding balance to the newest invoices first", () => {
        const statuses = deriveInvoiceStatuses(invoices, 600, { now });
        expect(statuses.get("c")).toBe("PENDING");
        expect(statuses.get("b")).toBe("PARTIAL");
        expect(statuses.get("a")).toBe("PAID");
    });

    it("flags unpaid invoices past their due date as overdue", () => {
        const statuses = deriveInvoiceStatuses(invoices, 1800, { now });
        expect(statuses.get("a")).toBe("OVERDUE");
        expect(statuses.get("b")).toBe("PENDING");
    });

    it("marks unpaid invoices of a bad-debt customer as bad debt", () => {
        const statuses = deriveInvoiceStatuses(invoices, 300, { now, isBadDebt: true });
        expect(statuses.get("c")).toBe("BAD_DEBT");
        expect(statuses.get("b")).toBe("PAID");
    });

    it("treats a credit balance (advance) as fully paid", () => {
        const statuses = deriveInvoiceStatuses(invoices, -250, { now });
        expect([...statuses.values()].every((s) => s === "PAID")).toBe(true);
    });
});

describe("effectiveInvoiceStatus", () => {
    const now = new Date("2026-06-15");
    it("upgrades unpaid past-due invoices to overdue only", () => {
        expect(effectiveInvoiceStatus("PENDING", new Date("2026-06-01"), now)).toBe("OVERDUE");
        expect(effectiveInvoiceStatus("PARTIAL", new Date("2026-06-01"), now)).toBe("OVERDUE");
        expect(effectiveInvoiceStatus("PAID", new Date("2026-06-01"), now)).toBe("PAID");
        expect(effectiveInvoiceStatus("PENDING", new Date("2026-07-01"), now)).toBe("PENDING");
    });
});

describe("canTransitionCheque", () => {
    it("only allows forward moves", () => {
        expect(canTransitionCheque("RECEIVED", "DEPOSITED")).toBe(true);
        expect(canTransitionCheque("RECEIVED", "BOUNCED")).toBe(true);
        expect(canTransitionCheque("DEPOSITED", "CLEARED")).toBe(true);
        expect(canTransitionCheque("DEPOSITED", "BOUNCED")).toBe(true);
        expect(canTransitionCheque("RECEIVED", "CLEARED")).toBe(false);
        expect(canTransitionCheque("BOUNCED", "BOUNCED")).toBe(false);
        expect(canTransitionCheque("CLEARED", "BOUNCED")).toBe(false);
    });
});

describe("wageBalanceChange / stockChange", () => {
    it("debits advances and credits every other wage entry", () => {
        expect(wageBalanceChange("ADVANCE", 5000)).toBe(-5000);
        expect(wageBalanceChange("PAYMENT", 5000)).toBe(5000);
        expect(wageBalanceChange("DEDUCTION", 200)).toBe(200);
    });

    it("signs stock movements by type", () => {
        expect(stockChange("IN", 10)).toBe(10);
        expect(stockChange("OUT", 10)).toBe(-10);
        expect(stockChange("ADJUSTMENT", -3)).toBe(-3);
    });
});
