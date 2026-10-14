// Pure helpers for dashboard aggregation. Months follow Pakistan time so a
// late-evening invoice is never counted in the wrong month on a UTC server.

export const BUSINESS_TIME_ZONE = "Asia/Karachi";

const monthFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
});

/** "2026-10" for any instant, in business time. */
export function monthKey(date: Date): string {
    const parts = monthFormatter.formatToParts(date);
    const year = parts.find((p) => p.type === "year")!.value;
    const month = parts.find((p) => p.type === "month")!.value;
    return `${year}-${month}`;
}

/** The last `count` month keys ending with the month containing `now`, oldest first. */
export function lastMonthKeys(count: number, now: Date = new Date()): string[] {
    const [year, month] = monthKey(now).split("-").map(Number);
    return Array.from({ length: count }, (_, i) => {
        const offset = count - 1 - i;
        const d = new Date(Date.UTC(year, month - 1 - offset, 1));
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    });
}

/** First instant of a month key in business time (Pakistan has no DST, UTC+5). */
export function startOfMonthKey(key: string): Date {
    const [year, month] = key.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, 1) - 5 * 60 * 60 * 1000);
}

/** Sum amounts into the given month buckets; amounts outside the range are ignored. */
export function sumByMonth(keys: string[], rows: { date: Date; amount: number }[]): number[] {
    const totals = new Map(keys.map((key) => [key, 0]));
    for (const row of rows) {
        const key = monthKey(row.date);
        if (totals.has(key)) totals.set(key, totals.get(key)! + row.amount);
    }
    return keys.map((key) => Math.round(totals.get(key)! * 100) / 100);
}

export function daysBetween(from: Date, to: Date): number {
    return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}
