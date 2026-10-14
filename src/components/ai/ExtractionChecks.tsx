"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ExtractionCheck } from "@/lib/ai/extraction-checks";
import type { MatchReason } from "@/lib/ai/customer-match";

interface ExtractionChecksProps {
    checks: ExtractionCheck[];
    model: string;
    escalated: boolean;
    matchReason?: MatchReason | null;
}

/** What the automatic checks found in an AI reading, shown above the review form. */
export default function ExtractionChecks({ checks, model, escalated, matchReason }: ExtractionChecksProps) {
    const t = useTranslations("aiChecks");
    const ordered = [...checks].sort((a, b) => (a.level === b.level ? 0 : a.level === "error" ? -1 : 1));
    const source = escalated ? t("rereadBy", { model }) : t("readBy", { model });

    return (
        <div
            role="status"
            className={`rounded-lg border px-4 py-3 text-sm ${ordered.length === 0
                ? "border-[#BFE3CC] bg-[var(--color-success-soft)]"
                : "border-[#F2D6A6] bg-[var(--color-warning-soft)]"}`}
        >
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-[var(--color-text-primary)]">
                {ordered.length === 0 ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-success)]" aria-hidden="true" />
                ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--color-warning)]" aria-hidden="true" />
                )}
                {ordered.length === 0 ? t("allPassed") : t("needsReview", { count: ordered.length })}
                <span className="text-xs font-normal text-[var(--color-text-secondary)]">· {source}</span>
            </p>
            {ordered.length > 0 && (
                <ul className="mt-2 space-y-1">
                    {ordered.map((check, i) => (
                        <li key={i} className="flex items-start gap-2 text-[var(--color-text-primary)]">
                            <span
                                aria-hidden="true"
                                className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${check.level === "error" ? "bg-[var(--color-error)]" : "bg-[var(--color-warning)]"}`}
                            />
                            <span>{t(`codes.${check.code}`, { line: check.line ?? 0, ...check.values })}</span>
                        </li>
                    ))}
                </ul>
            )}
            {matchReason && (
                <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{t("matched", { reason: matchReason })}</p>
            )}
        </div>
    );
}
