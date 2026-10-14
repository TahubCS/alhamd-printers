"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PackageCheck } from "lucide-react";
import { receivePurchaseOrder } from "@/actions/supplier";
import { Button } from "@/components/ui/Button";

interface ReceivableLine {
    id: string;
    description: string;
    remaining: number;
    stocked: boolean;
}

export default function ReceiveGoodsForm({ purchaseOrderId, lines }: { purchaseOrderId: string; lines: ReceivableLine[] }) {
    const t = useTranslations("suppliers");
    const router = useRouter();
    const open = lines.filter((line) => line.remaining > 0);
    const [quantities, setQuantities] = useState<Record<string, string>>(() =>
        Object.fromEntries(open.map((line) => [line.id, String(line.remaining)]))
    );
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const result = await receivePurchaseOrder(
            purchaseOrderId,
            open.map((line) => ({ itemId: line.id, quantity: quantities[line.id] || 0 }))
        );
        setBusy(false);
        if (!result.success) {
            setError(result.error ?? t("genericError"));
            return;
        }
        router.refresh();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">{t("receiveHint")}</p>
            {error && <p role="alert" className="rounded-lg border border-[#F3C3BE] bg-[var(--color-error-soft)] px-3 py-2 text-sm text-[var(--color-error)]">{error}</p>}
            {open.map((line) => (
                <div key={line.id} className="space-y-2">
                    <label htmlFor={`receive-${line.id}`} className="block text-sm text-[var(--color-text-primary)]">
                        {line.description}
                        <span className="block text-xs text-[var(--color-text-muted)]">
                            {t("remaining", { count: line.remaining })}{line.stocked ? ` · ${t("addsToStock")}` : ""}
                        </span>
                    </label>
                    <input
                        id={`receive-${line.id}`}
                        type="number"
                        min="0"
                        max={line.remaining}
                        step="1"
                        className="input"
                        value={quantities[line.id] ?? ""}
                        onChange={(e) => setQuantities((prev) => ({ ...prev, [line.id]: e.target.value }))}
                    />
                </div>
            ))}
            <Button type="submit" className="w-full" isLoading={busy}>
                <PackageCheck className="h-4 w-4" aria-hidden="true" />
                {t("receiveGoods")}
            </Button>
        </form>
    );
}
