"use client";

import { useState } from "react";
import { SerializedRawMaterial } from "@/actions/inventory";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/Table";
import { Plus, Minus, PackagePlus } from "lucide-react";
import AddMaterialDialog from "./AddMaterialDialog";
import StockTransactionDialog from "./StockTransactionDialog";

interface Props {
    initialMaterials: SerializedRawMaterial[];
    locale: string;
}

export default function InventoryDashboard({ initialMaterials, locale }: Props) {
    const [materials, setMaterials] = useState<SerializedRawMaterial[]>(initialMaterials);
    const [showAddMaterial, setShowAddMaterial] = useState(false);
    const [transactionState, setTransactionState] = useState<{
        isOpen: boolean;
        type: "IN" | "OUT" | "ADJUSTMENT";
        materialId: string | null;
        materialName: string | null;
    }>({
        isOpen: false,
        type: "IN",
        materialId: null,
        materialName: null,
    });

    const formatAttributes = (attrs: any) => {
        if (!attrs || typeof attrs !== 'object') return '-';
        return Object.entries(attrs)
            .map(([key, value]) => `${key}: ${value}`)
            .join(' | ');
    };

    const handleTransactionSuccess = (updatedMaterial: SerializedRawMaterial) => {
        setMaterials(prev => prev.map(m => m.id === updatedMaterial.id ? updatedMaterial : m));
        setTransactionState({ ...transactionState, isOpen: false });
    };

    const handleMaterialAdded = (newMaterial: SerializedRawMaterial) => {
        setMaterials(prev => [...prev, newMaterial]);
        setShowAddMaterial(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={() => setShowAddMaterial(true)}>
                    <PackagePlus className="w-4 h-4 mr-2" />
                    Add New Material Type
                </Button>
            </div>

            <Card className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Attributes</TableHead>
                                <TableHead className="text-right">Current Stock</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {materials.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-[var(--color-text-muted)]">
                                        No materials found. Add your first material type above.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                materials.map((material) => (
                                    <TableRow key={material.id}>
                                        <TableCell className="font-medium text-[var(--color-text-primary)]">
                                            {material.name}
                                        </TableCell>
                                        <TableCell className="text-[var(--color-text-secondary)]">
                                            {material.type}
                                        </TableCell>
                                        <TableCell className="text-[var(--color-text-secondary)] text-sm">
                                            {formatAttributes(material.attributes)}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-[var(--color-text-primary)]">
                                            {Number(material.quantity)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => setTransactionState({
                                                        isOpen: true,
                                                        type: "IN",
                                                        materialId: material.id,
                                                        materialName: material.name
                                                    })}
                                                    title="Add Stock"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    disabled={Number(material.quantity) <= 0}
                                                    onClick={() => setTransactionState({
                                                        isOpen: true,
                                                        type: "OUT",
                                                        materialId: material.id,
                                                        materialName: material.name
                                                    })}
                                                    title="Use Stock"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Modals */}
            {showAddMaterial && (
                <AddMaterialDialog
                    onClose={() => setShowAddMaterial(false)}
                    onSuccess={handleMaterialAdded}
                />
            )}

            {transactionState.isOpen && transactionState.materialId && (
                <StockTransactionDialog
                    isOpen={transactionState.isOpen}
                    type={transactionState.type}
                    materialId={transactionState.materialId}
                    materialName={transactionState.materialName || ""}
                    onClose={() => setTransactionState(prev => ({ ...prev, isOpen: false }))}
                    onSuccess={handleTransactionSuccess}
                />
            )}
        </div>
    );
}
