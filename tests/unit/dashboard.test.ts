import { describe, expect, it } from "vitest";
import { daysBetween, lastMonthKeys, monthKey, startOfMonthKey, sumByMonth } from "@/lib/dashboard";

describe("dashboard month helpers", () => {
    it("uses Pakistan time for month boundaries", () => {
        // 21:00 UTC on 31 Oct is 02:00 on 1 Nov in Karachi
        expect(monthKey(new Date("2026-10-31T21:00:00Z"))).toBe("2026-11");
        expect(monthKey(new Date("2026-10-31T18:00:00Z"))).toBe("2026-10");
    });

    it("lists trailing months across a year boundary", () => {
        expect(lastMonthKeys(4, new Date("2026-02-10T12:00:00Z"))).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    });

    it("finds the first instant of a business month", () => {
        expect(startOfMonthKey("2026-11").toISOString()).toBe("2026-10-31T19:00:00.000Z");
        expect(monthKey(startOfMonthKey("2026-11"))).toBe("2026-11");
    });

    it("buckets amounts by month and ignores out-of-range rows", () => {
        const keys = ["2026-09", "2026-10"];
        const totals = sumByMonth(keys, [
            { date: new Date("2026-09-15T10:00:00Z"), amount: 100.1 },
            { date: new Date("2026-10-01T10:00:00Z"), amount: 50 },
            { date: new Date("2026-10-20T10:00:00Z"), amount: 0.2 },
            { date: new Date("2026-08-01T10:00:00Z"), amount: 999 },
        ]);
        expect(totals).toEqual([100.1, 50.2]);
    });

    it("counts whole days elapsed", () => {
        expect(daysBetween(new Date("2026-10-01T00:00:00Z"), new Date("2026-10-11T12:00:00Z"))).toBe(10);
    });
});
