"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createRawMaterial, RawMaterialType, SerializedRawMaterial } from "@/actions/inventory";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

interface Props {
    onClose: () => void;
    onSuccess: (newMaterial: SerializedRawMaterial) => void;
}

const MATERIAL_TYPES: RawMaterialType[] = ["ROLL", "HANGER", "BUTTON", "TAPE", "OTHER"];
const ROLL_QUALITIES = ["Super Clear", "Imported", "Normal", "Matt"] as const;

export default function AddMaterialDialog({ onClose, onSuccess }: Props) {
    const t = useTranslations("inventory");
    const tActions = useTranslations("actions");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [type, setType] = useState<RawMaterialType>("ROLL");
    const [initialQuantity, setInitialQuantity] = useState("0");
    const [minStock, setMinStock] = useState("10");

    // Attributes
    const [thickness, setThickness] = useState("");
    const [quality, setQuality] = useState<string>(ROLL_QUALITIES[0]);
    const [size, setSize] = useState("");
    const [details, setDetails] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        let attributes: Record<string, string> = {};
        if (type === "ROLL") {
            attributes = { thickness, quality };
        } else if (type === "HANGER" || type === "BUTTON") {
            attributes = { size };
        } else {
            attributes = { details };
        }

        const result = await createRawMaterial({
            name,
            type,
            quantity: parseFloat(initialQuantity) || 0,
            minimumStockLevel: parseFloat(minStock) || 0,
            attributes,
        });

        setIsLoading(false);
        if (result.success && result.data) {
            onSuccess(result.data);
        } else {
            setError(result.error ?? t("transaction.genericError"));
        }
    };

    return (
        <Dialog title={t("addMaterial")} closeLabel={tActions("cancel")} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p role="alert" className="rounded-lg border border-[#F3C3BE] bg-[var(--color-error-soft)] px-3 py-2 text-sm text-[var(--color-error)]">{error}</p>}
                <div>
                    <Label htmlFor="material-type" className="mb-2 block text-[var(--color-text-primary)]">{t("type")}</Label>
                    <select id="material-type" className="input" value={type} onChange={(e) => setType(e.target.value as RawMaterialType)}>
                        {MATERIAL_TYPES.map((value) => (
                            <option key={value} value={value}>{t(`types.${value}`)}</option>
                        ))}
                    </select>
                </div>

                <Input id="material-name" label={t("name")} value={name} onChange={(e) => setName(e.target.value)} placeholder="0.9mm Super Clear" required />

                {type === "ROLL" && (
                    <div className="grid grid-cols-2 gap-4">
                        <Input id="material-thickness" label={t("attributes.thickness")} value={thickness} onChange={(e) => setThickness(e.target.value)} placeholder="0.9" />
                        <div>
                            <Label htmlFor="material-quality" className="mb-2 block text-[var(--color-text-primary)]">{t("attributes.quality")}</Label>
                            <select id="material-quality" className="input" value={quality} onChange={(e) => setQuality(e.target.value)}>
                                {ROLL_QUALITIES.map((q) => <option key={q} value={q}>{q}</option>)}
                            </select>
                        </div>
                    </div>
                )}

                {(type === "HANGER" || type === "BUTTON") && (
                    <Input id="material-size" label={t("attributes.size")} value={size} onChange={(e) => setSize(e.target.value)} placeholder="14in" />
                )}

                {(type === "TAPE" || type === "OTHER") && (
                    <Input id="material-details" label={t("attributes.details")} value={details} onChange={(e) => setDetails(e.target.value)} />
                )}

                <div className="grid grid-cols-2 gap-4">
                    <Input id="material-qty" type="number" min="0" step="1" label={t("openingStock")} value={initialQuantity} onChange={(e) => setInitialQuantity(e.target.value)} />
                    <Input id="material-min" type="number" min="0" step="1" label={t("alertLevel")} value={minStock} onChange={(e) => setMinStock(e.target.value)} />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={onClose}>{tActions("cancel")}</Button>
                    <Button type="submit" isLoading={isLoading}>{t("saveMaterial")}</Button>
                </div>
            </form>
        </Dialog>
    );
}
