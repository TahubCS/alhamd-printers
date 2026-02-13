"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { adjustStock } from "@/actions/inventory";

interface Props {
    isOpen: boolean;
    type: "IN" | "OUT" | "ADJUSTMENT";
    materialId: string;
    materialName: string;
    onClose: () => void;
    onSuccess: (updatedMaterial: any) => void;
}

export default function StockTransactionDialog({ isOpen, type, materialId, materialName, onClose, onSuccess }: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const [quantity, setQuantity] = useState("");
    const [notes, setNotes] = useState("");
    const [poNumber, setPoNumber] = useState("");

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty <= 0) {
            alert("Please enter a valid quantity");
            setIsLoading(false);
            return;
        }

        const result = await adjustStock(
            materialId,
            qty,
            type,
            notes + (poNumber ? ` (PO: ${poNumber})` : ""),
            undefined // relatedPoId - can link later if we have PO selection dropdown
        );

        setIsLoading(false);

        if (result.success) {
            onSuccess(result.data);
            onClose();
        } else {
            alert(result.error);
        }
    };

    const isAdd = type === "IN";
    const title = isAdd ? "Add Stock" : "Use Stock";
    const actionLabel = isAdd ? "Add to Stock" : "Remove from Stock";
    const colorClass = isAdd ? "text-green-600" : "text-red-600";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">
                        {title} - <span className="text-base font-normal text-[var(--color-text-secondary)]">{materialName}</span>
                    </h2>
                    <Button variant="ghost" size="sm" onClick={onClose}>X</Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label>Quantity {isAdd ? "(Active Stock)" : "(To Consume)"}</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="0.00"
                            required
                            autoFocus
                        />
                    </div>

                    {!isAdd && (
                        <div>
                            <Label>Related PO Number (Optional)</Label>
                            <Input
                                value={poNumber}
                                onChange={(e) => setPoNumber(e.target.value)}
                                placeholder="e.g. 1835"
                            />
                        </div>
                    )}

                    <div>
                        <Label>Notes</Label>
                        <Input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={isAdd ? "e.g. Purchase from Local Market" : "e.g. Used for Urgent Job"}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button
                            type="submit"
                            isLoading={isLoading}
                            variant={isAdd ? "primary" : "danger"}
                        >
                            {actionLabel}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
