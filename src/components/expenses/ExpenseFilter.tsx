"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";

const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export default function ExpenseFilter() {
    const t = useTranslations("expenses");
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [month, setMonth] = useState(searchParams.get("month") || "");
    const [year, setYear] = useState(searchParams.get("year") || String(new Date().getFullYear()));
    const thisYear = new Date().getFullYear();

    const applyFilter = () => {
        const params = new URLSearchParams();
        if (month) params.set("month", month);
        if (year) params.set("year", year);
        router.push(pathname + (params.toString() ? "?" + params.toString() : ""));
    };

    const clearFilter = () => {
        setMonth("");
        setYear(String(thisYear));
        router.push(pathname);
    };

    return (
        <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                {t("filterByMonth")}:
            </span>
            <div className="flex gap-2">
                <select
                    style={{
                        width: "160px",
                        height: "36px",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontSize: "14px",
                        background: "var(--color-bg-tertiary)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text-primary)",
                        appearance: "auto",
                    }}
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                >
                    <option value="">{t("allMonths")}</option>
                    {months.map((m, i) => (
                        <option key={i + 1} value={i + 1}>
                            {m}
                        </option>
                    ))}
                </select>
                <select
                    style={{
                        width: "100px",
                        height: "36px",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontSize: "14px",
                        background: "var(--color-bg-tertiary)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text-primary)",
                        appearance: "auto",
                    }}
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                >
                    {[thisYear, thisYear - 1, thisYear - 2].map((y) => (
                        <option key={y} value={y}>
                            {y}
                        </option>
                    ))}
                </select>
            </div>
            <Button size="sm" variant="secondary" onClick={applyFilter}>
                {t("applyFilter")}
            </Button>
            <Button size="sm" variant="outline" onClick={clearFilter}>
                {t("clearFilter")}
            </Button>
        </div>
    );
}
