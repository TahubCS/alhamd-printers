"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { createPurchaseOrder } from "@/actions/supplier";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { calculateDocumentTotals } from "@/lib/finance";
import { formatPKR } from "@/lib/utils";

interface Option {
    id: string;
    name: string;
}

interface Line {
    materialId: string;
    description: string;
    specification: string;
    quantity: string;
    rate: string;
}

const blankLine = (): Line => ({ materialId: "", description: "", specification: "", quantity: "", rate: "" });

export default function PurchaseForm({
    suppliers,
    materials,
    initialSupplierId,
    locale,
}: {
    suppliers: Option[];
    materials: Option[];
    initialSupplierId?: string;
    locale: string;
}) {
    const t = useTranslations("suppliers");
    const tActions = useTranslations("actions");
    const router = useRouter();
    const [supplierId, setSupplierId] = useState(initialSupplierId ?? "");
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState("");
    const [lines, setLines] = useState<Line[]>([blankLine()]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const totals = calculateDocumentTotals(lines.map((l) => ({ quantity: Number(l.quantity) || 0, rate: Number(l.rate) || 0 })));

    const updateLine = (index: number, field: keyof Line, value: string) =>
        setLines((prev) =>
            prev.map((line, i) => {
                if (i !== index) return line;
                const next = { ...line, [field]: value };
                // Picking a stock material names the line after it unless the user typed something
                if (field === "materialId" && !line.description) {
                    next.description = materials.find((m) => m.id === value)?.name ?? "";
                }
                return next;
            })
        );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const result = await createPurchaseOrder({ supplierId, date, notes, items: lines });
        setBusy(false);
        if (!result.success || !result.data) {
            setError(result.error ?? t("genericError"));
            return;
        }
        router.push(`/suppliers/purchases/${result.data.id}`);
        router.refresh();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p role="alert" className="rounded-lg border border-[#F3C3BE] bg-[var(--color-error-soft)] px-4 py-3 text-sm text-[var(--color-error)]">{error}</p>}

            <Card>
                <CardContent className="grid gap-5 p-6 sm:grid-cols-3">
                    <div>
                        <Label htmlFor="po-supplier" className="mb-2 block text-[var(--color-text-primary)]">{t("supplier")}</Label>
                        <select id="po-supplier" className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
                            <option value="">{t("selectSupplier")}</option>
                            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <Input id="po-date" type="date" label={t("date")} value={date} onChange={(e) => setDate(e.target.value)} required />
                    <Input id="po-notes" label={t("notes")} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </CardContent>
            </Card>

            <Card>
                <CardContent className="space-y-4 p-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t("items")}</h2>
                        <Button type="button" size="sm" variant="outline" onClick={() => setLines((prev) => [...prev, blankLine()])}>
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            {t("addLine")}
                        </Button>
                    </div>
                    {lines.map((line, index) => (
                        <div key={index} className="grid gap-3 rounded-lg border border-[var(--color-border)] p-4 sm:grid-cols-6">
                            <div className="sm:col-span-2">
                                <Label htmlFor={`po-line-${index}-material`} className="mb-2 block text-[var(--color-text-primary)]">{t("stockItem")}</Label>
                                <select id={`po-line-${index}-material`} className="input" value={line.materialId} onChange={(e) => updateLine(index, "materialId", e.target.value)}>
                                    <option value="">{t("notStocked")}</option>
                                    {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <Input id={`po-line-${index}-desc`} label={t("description")} value={line.description} onChange={(e) => updateLine(index, "description", e.target.value)} required />
                            </div>
                            <div className="sm:col-span-2">
                                <Input id={`po-line-${index}-spec`} label={t("specification")} value={line.specification} onChange={(e) => updateLine(index, "specification", e.target.value)} />
                            </div>
                            <div className="sm:col-span-2">
                                <Input id={`po-line-${index}-qty`} type="number" min="1" step="1" label={t("quantity")} value={line.quantity} onChange={(e) => updateLine(index, "quantity", e.target.value)} required />
                            </div>
                            <div className="sm:col-span-2">
                                <Input id={`po-line-${index}-rate`} type="number" min="0" step="0.01" label={t("rate")} value={line.rate} onChange={(e) => updateLine(index, "rate", e.target.value)} required />
                            </div>
                            <div className="flex items-end justify-between gap-3 sm:col-span-2">
                                <p className="pb-3 font-medium text-[var(--color-text-primary)]">{formatPKR(totals.lines[index].amount, locale, 2)}</p>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="mb-1 text-[var(--color-error)]"
                                    disabled={lines.length === 1}
                                    onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                                    aria-label={t("removeLine")}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    <div className="flex justify-end border-t border-[var(--color-border)] pt-4 text-lg font-semibold text-[var(--color-text-primary)]">
                        {t("orderTotal")}: <span className="ms-2 text-[var(--color-accent-primary)]">{formatPKR(totals.total, locale, 2)}</span>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>{tActions("cancel")}</Button>
                <Button type="submit" isLoading={busy}>{t("savePurchase")}</Button>
            </div>
        </form>
    );
}
