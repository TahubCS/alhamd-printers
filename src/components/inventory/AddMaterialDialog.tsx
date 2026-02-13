"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/Dialog";
import { createRawMaterial } from "@/actions/inventory";
import { useRouter } from "next/navigation";

interface Props {
    onClose: () => void;
    onSuccess: (newMaterial: any) => void;
}

const MATERIAL_TYPES = [
    { value: "ROLL", label: "PVC Roll" },
    { value: "HANGER", label: "Hanger" },
    { value: "BUTTON", label: "Button" },
    { value: "TAPE", label: "Tape" },
    { value: "OTHER", label: "Other" },
];

export default function AddMaterialDialog({ onClose, onSuccess }: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState("");
    const [type, setType] = useState("ROLL");
    const [initialQuantity, setInitialQuantity] = useState("0");
    const [minStock, setMinStock] = useState("10");

    // Attributes
    const [thickness, setThickness] = useState("");
    const [quality, setQuality] = useState("Super Clear"); // Default
    const [size, setSize] = useState("");
    const [genericAttr, setGenericAttr] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Build attributes based on type
        let attributes = {};
        if (type === "ROLL") {
            attributes = { thickness, quality };
        } else if (type === "HANGER" || type === "BUTTON") {
            attributes = { size };
        } else {
            attributes = { details: genericAttr };
        }

        const result = await createRawMaterial({
            name,
            type: type as any,
            quantity: parseFloat(initialQuantity) || 0,
            minimumStockLevel: parseFloat(minStock) || 0,
            attributes
        });

        setIsLoading(false);

        if (result.success) {
            onSuccess(result.data);
            onClose();
        } else {
            alert(result.error);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Add New Material</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}>X</Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label>Material Type</Label>
                        <select
                            className="w-full p-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                        >
                            {MATERIAL_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <Label>Name / Description</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. 0.9mm Super Clear"
                            required
                        />
                    </div>

                    {/* Dynamic Attribute Fields */}
                    {type === "ROLL" && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Thickness (mm)</Label>
                                <Input
                                    value={thickness}
                                    onChange={(e) => setThickness(e.target.value)}
                                    placeholder="0.9"
                                />
                            </div>
                            <div>
                                <Label>Quality</Label>
                                <select
                                    className="w-full p-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
                                    value={quality}
                                    onChange={(e) => setQuality(e.target.value)}
                                >
                                    <option value="Super Clear">Super Clear</option>
                                    <option value="Imported">Imported</option>
                                    <option value="Normal">Normal</option>
                                    <option value="Matt">Matt</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {(type === "HANGER" || type === "BUTTON") && (
                        <div>
                            <Label>Size</Label>
                            <Input
                                value={size}
                                onChange={(e) => setSize(e.target.value)}
                                placeholder="Size/Dimensions"
                            />
                        </div>
                    )}

                    {/* Stock Levels */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Initial Stock (Count)</Label>
                            <Input
                                type="number"
                                step="1"
                                value={initialQuantity}
                                onChange={(e) => setInitialQuantity(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Min. Alert Level</Label>
                            <Input
                                type="number"
                                step="1"
                                value={minStock}
                                onChange={(e) => setMinStock(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit" isLoading={isLoading}>Save Material</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
