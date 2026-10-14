"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

export interface TrendPoint {
    month: string; // "2026-10"
    sales: number;
    expenses: number;
}

// Categorical slots 1–2 of the dark palette, validated against the card surface
const SERIES = [
    { key: "sales", color: "#2A78D6" },
    { key: "expenses", color: "#EB6834" },
] as const;

const WIDTH = 640;
const HEIGHT = 260;
const PAD = { top: 12, right: 8, bottom: 28, left: 64 };
const BAR_GAP = 2;
const RADIUS = 4;

/** Round the axis maximum up to a readable step so gridlines land on clean numbers. */
function niceMax(value: number) {
    if (value <= 0) return 1000;
    const magnitude = 10 ** Math.floor(Math.log10(value));
    const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value / 4)! * magnitude;
    return step * 4;
}

/** Bar with a rounded data end and a square base sitting on the baseline. */
function barPath(x: number, y: number, width: number, height: number) {
    if (height <= 0) return "";
    const r = Math.min(RADIUS, width / 2, height);
    return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
}

export default function TrendChart({ data }: { data: TrendPoint[] }) {
    const t = useTranslations("dashboard.trend");
    const locale = useLocale();
    const tableId = useId();
    const [active, setActive] = useState<number | null>(null);
    const [showTable, setShowTable] = useState(false);

    const intlLocale = locale === "ur" ? "ur-PK" : "en-PK";
    const compact = new Intl.NumberFormat(intlLocale, { notation: "compact", maximumFractionDigits: 1 });
    const full = new Intl.NumberFormat(intlLocale, { style: "currency", currency: "PKR", maximumFractionDigits: 0 });
    const monthLabel = (key: string, style: "short" | "long" = "short") => {
        const [y, m] = key.split("-").map(Number);
        return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString(intlLocale, { month: style, year: style === "long" ? "numeric" : undefined, timeZone: "UTC" });
    };

    const max = niceMax(Math.max(...data.flatMap((d) => [d.sales, d.expenses])));
    const plotW = WIDTH - PAD.left - PAD.right;
    const plotH = HEIGHT - PAD.top - PAD.bottom;
    const band = plotW / data.length;
    const barW = Math.min(28, (band * 0.6 - BAR_GAP) / 2);
    const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
    const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);
    const empty = data.every((d) => d.sales === 0 && d.expenses === 0);

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <ul className="flex flex-wrap gap-4 text-sm text-[var(--color-text-secondary)]" aria-label={t("legend")}>
                    {SERIES.map((s) => (
                        <li key={s.key} className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-sm" style={{ background: s.color }} aria-hidden="true" />
                            {t(s.key)}
                        </li>
                    ))}
                </ul>
                <button
                    type="button"
                    className="text-sm text-[var(--color-accent-primary)] hover:underline"
                    aria-expanded={showTable}
                    aria-controls={tableId}
                    onClick={() => setShowTable((v) => !v)}
                >
                    {showTable ? t("showChart") : t("showTable")}
                </button>
            </div>

            {showTable ? (
                <div id={tableId} className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)]">
                                <th className="py-2 text-start font-medium">{t("month")}</th>
                                <th className="py-2 text-end font-medium">{t("sales")}</th>
                                <th className="py-2 text-end font-medium">{t("expenses")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((d) => (
                                <tr key={d.month} className="border-b border-[var(--color-border)] last:border-0">
                                    <td className="py-2 text-[var(--color-text-primary)]">{monthLabel(d.month, "long")}</td>
                                    <td className="py-2 text-end text-[var(--color-text-primary)]">{full.format(d.sales)}</td>
                                    <td className="py-2 text-end text-[var(--color-text-primary)]">{full.format(d.expenses)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                // Keep labels legible on phones by scrolling the chart instead of shrinking it
                <div className="overflow-x-auto" dir="ltr">
                <div className="relative min-w-[520px]">
                    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label={t("ariaLabel")}>
                        {ticks.map((tick) => (
                            <g key={tick}>
                                <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--color-divider)" strokeWidth={1} />
                                <text x={PAD.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--color-text-muted)">
                                    {compact.format(tick)}
                                </text>
                            </g>
                        ))}

                        {data.map((d, i) => {
                            const groupX = PAD.left + band * i + (band - (barW * 2 + BAR_GAP)) / 2;
                            return (
                                <g key={d.month}>
                                    {active === i && <rect x={PAD.left + band * i} y={PAD.top} width={band} height={plotH} fill="var(--color-bg-hover)" opacity={0.6} />}
                                    {SERIES.map((s, si) => {
                                        const value = d[s.key];
                                        return (
                                            <path
                                                key={s.key}
                                                d={barPath(groupX + si * (barW + BAR_GAP), y(value), barW, PAD.top + plotH - y(value))}
                                                fill={s.color}
                                                opacity={active === null || active === i ? 1 : 0.55}
                                            />
                                        );
                                    })}
                                    <text x={PAD.left + band * i + band / 2} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="var(--color-text-secondary)">
                                        {monthLabel(d.month)}
                                    </text>
                                    {/* Hit area wider than the bars, also reachable by keyboard */}
                                    <rect
                                        x={PAD.left + band * i}
                                        y={PAD.top}
                                        width={band}
                                        height={plotH}
                                        fill="transparent"
                                        tabIndex={0}
                                        aria-label={`${monthLabel(d.month, "long")}: ${t("sales")} ${full.format(d.sales)}, ${t("expenses")} ${full.format(d.expenses)}`}
                                        onMouseEnter={() => setActive(i)}
                                        onMouseLeave={() => setActive(null)}
                                        onFocus={() => setActive(i)}
                                        onBlur={() => setActive(null)}
                                        style={{ outline: "none" }}
                                    />
                                </g>
                            );
                        })}
                        <line x1={PAD.left} x2={WIDTH - PAD.right} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke="var(--color-border-light)" strokeWidth={1} />
                    </svg>

                    {empty && (
                        <p className="absolute inset-0 flex items-center justify-center text-sm text-[var(--color-text-muted)]">{t("empty")}</p>
                    )}

                    {active !== null && (
                        <div
                            role="status"
                            className="pointer-events-none absolute top-2 z-10 min-w-44 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm shadow-lg"
                            style={{
                                left: `${((PAD.left + band * (active + 0.5)) / WIDTH) * 100}%`,
                                transform: active >= data.length / 2 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
                            }}
                        >
                            <p className="mb-1 font-medium text-[var(--color-text-primary)]">{monthLabel(data[active].month, "long")}</p>
                            {SERIES.map((s) => (
                                <p key={s.key} className="flex items-center justify-between gap-4 text-[var(--color-text-secondary)]">
                                    <span className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} aria-hidden="true" />
                                        {t(s.key)}
                                    </span>
                                    <span className="font-medium text-[var(--color-text-primary)]">{full.format(data[active][s.key])}</span>
                                </p>
                            ))}
                        </div>
                    )}
                </div>
                </div>
            )}
        </div>
    );
}
