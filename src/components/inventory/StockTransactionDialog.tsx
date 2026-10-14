"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { adjustStock, SerializedRawMaterial, TransactionType } from "@/actions/inventory";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";

interface Props {
    type: TransactionType;
    materialId: string;
    materialName: string;
    onClose: () => void;
    onSuccess: (updatedMaterial: SerializedRawMaterial) => void;
}

export default function StockTransactionDialog({ type, materialId, materialName, onClose, onSuccess }: Props) {
    const t = useTranslations("inventory.transaction");
    const tActions = useTranslations("actions");
    const [isLoading, setIsLoading] = useState(false);
    const [quantity, setQuantity] = useState("");
    const [notes, setNotes] = useState("");
    const [reference, setReference] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const qty = parseFloat(quantity);
        // Adjustments carry their own sign; additions and withdrawals must be positive
        if (isNaN(qty) || qty === 0 || (type !== "ADJUSTMENT" && qty < 0)) {
            setError(t("invalidQuantity"));
            return;
        }
        setIsLoading(true);
        setError(null);
        const noteText = [notes.trim(), reference.trim() && `${t("referenceShort")}: ${reference.trim()}`].filter(Boolean).join(" · ");
        const result = await adjustStock(materialId, qty, type, noteText || undefined);
        setIsLoading(false);
        if (result.success && result.data) {
            onSuccess(result.data);
        } else {
            setError(result.error ?? t("genericError"));
        }
    };

    return (
        <Dialog title={t(`title.${type}`)} description={materialName} closeLabel={tActions("cancel")} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p role="alert" className="rounded-lg border border-[#F3C3BE] bg-[var(--color-error-soft)] px-3 py-2 text-sm text-[var(--color-error)]">{error}</p>}
                <Input
                    id="stock-qty"
                    type="number"
                    step="0.01"
                    min={type === "ADJUSTMENT" ? undefined : "0.01"}
                    label={t(`quantity.${type}`)}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder={type === "ADJUSTMENT" ? "-5 / +5" : "0"}
                    required
                />
                {type === "OUT" && (
                    <Input id="stock-ref" label={t("reference")} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="PO-4101" />
                )}
                <Input id="stock-notes" label={t("notes")} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t(`notesPlaceholder.${type}`)} />
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={onClose}>{tActions("cancel")}</Button>
                    <Button type="submit" isLoading={isLoading} variant={type === "OUT" ? "danger" : "primary"}>{t(`submit.${type}`)}</Button>
                </div>
            </form>
        </Dialog>
    );
}
