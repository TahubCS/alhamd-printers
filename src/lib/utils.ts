import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | undefined | null) {
    if (amount === undefined || amount === null) return "0.00";
    return Number(amount).toLocaleString('en-PK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/** Rupee amount formatted for the active UI language. */
export function formatPKR(amount: number, locale: string, fractionDigits = 0) {
    return new Intl.NumberFormat(locale === "ur" ? "ur-PK" : "en-PK", {
        style: "currency",
        currency: "PKR",
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: Math.max(fractionDigits, 2),
    }).format(amount);
}

export function formatDisplayDate(date: Date | string, locale: string, options?: Intl.DateTimeFormatOptions) {
    return new Date(date).toLocaleDateString(locale === "ur" ? "ur-PK" : "en-PK", options);
}
