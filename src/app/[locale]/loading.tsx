import { useTranslations } from "next-intl";

export default function Loading() {
    const t = useTranslations("common");
    return (
        <div role="status" aria-live="polite" className="space-y-6">
            <span className="sr-only">{t("loading")}</span>
            <div className="h-8 w-56 animate-pulse rounded-md bg-[var(--color-neutral-soft)]" />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-28 animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)]" />
                ))}
            </div>
        </div>
    );
}
