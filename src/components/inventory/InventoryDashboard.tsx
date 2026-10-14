"use client";

import { Fragment, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, History, Minus, PackagePlus, Plus, SlidersHorizontal } from "lucide-react";
import { getTransactionHistory, SerializedRawMaterial, SerializedTransaction, TransactionType } from "@/actions/inventory";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { formatDisplayDate } from "@/lib/utils";
import AddMaterialDialog from "./AddMaterialDialog";
import StockTransactionDialog from "./StockTransactionDialog";

interface Props {
    initialMaterials: SerializedRawMaterial[];
}

interface DialogState {
    type: TransactionType;
    materialId: string;
    materialName: string;
}

export default function InventoryDashboard({ initialMaterials }: Props) {
    const t = useTranslations("inventory");
    const locale = useLocale();
    const number = new Intl.NumberFormat(locale === "ur" ? "ur-PK" : "en-PK", { maximumFractionDigits: 2 });
    const [materials, setMaterials] = useState<SerializedRawMaterial[]>(initialMaterials);
    const [showAddMaterial, setShowAddMaterial] = useState(false);
    const [dialog, setDialog] = useState<DialogState | null>(null);
    const [openHistory, setOpenHistory] = useState<string | null>(null);
    const [history, setHistory] = useState<Record<string, SerializedTransaction[]>>({});

    const lowStockCount = materials.filter((m) => m.quantity <= m.minimumStockLevel).length;

    const formatAttributes = (attrs: unknown) => {
        if (!attrs || typeof attrs !== "object") return "—";
        const entries = Object.entries(attrs).filter(([, value]) => value !== "" && value != null);
        if (entries.length === 0) return "—";
        return entries.map(([key, value]) => `${t.has(`attributes.${key}`) ? t(`attributes.${key}`) : key}: ${value}`).join(" · ");
    };

    const loadHistory = async (materialId: string, force = false) => {
        if (!force && history[materialId]) return;
        const result = await getTransactionHistory(materialId);
        if (result.success && result.data) {
            setHistory((prev) => ({ ...prev, [materialId]: result.data! }));
        }
    };

    const toggleHistory = async (materialId: string) => {
        if (openHistory === materialId) {
            setOpenHistory(null);
            return;
        }
        setOpenHistory(materialId);
        await loadHistory(materialId);
    };

    const handleTransactionSuccess = (updated: SerializedRawMaterial) => {
        setMaterials((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        setDialog(null);
        if (openHistory === updated.id || history[updated.id]) loadHistory(updated.id, true);
    };

    const handleMaterialAdded = (created: SerializedRawMaterial) => {
        setMaterials((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setShowAddMaterial(false);
    };

    const open = (type: TransactionType, material: SerializedRawMaterial) =>
        setDialog({ type, materialId: material.id, materialName: material.name });

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[var(--color-text-secondary)]">
                    {t("summary", { count: materials.length, low: lowStockCount })}
                </p>
                <Button onClick={() => setShowAddMaterial(true)}>
                    <PackagePlus className="h-4 w-4" aria-hidden="true" />
                    {t("addMaterial")}
                </Button>
            </div>

            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("name")}</TableHead>
                                <TableHead>{t("type")}</TableHead>
                                <TableHead>{t("details")}</TableHead>
                                <TableHead className="text-end">{t("currentStock")}</TableHead>
                                <TableHead className="text-end">{t("actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {materials.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-8 text-center text-[var(--color-text-muted)]">{t("empty")}</TableCell>
                                </TableRow>
                            ) : (
                                materials.map((material) => {
                                    const low = material.quantity <= material.minimumStockLevel;
                                    const rows = history[material.id];
                                    return (
                                        <Fragment key={material.id}>
                                            <TableRow>
                                                <TableCell className="font-medium text-[var(--color-text-primary)]">{material.name}</TableCell>
                                                <TableCell className="text-[var(--color-text-secondary)]">{t(`types.${material.type}`)}</TableCell>
                                                <TableCell className="text-sm text-[var(--color-text-secondary)]">{formatAttributes(material.attributes)}</TableCell>
                                                <TableCell className="text-end">
                                                    <span className="font-semibold text-[var(--color-text-primary)]">{number.format(material.quantity)}</span>
                                                    <div className="mt-1 flex justify-end">
                                                        {low ? (
                                                            <Badge variant={material.quantity <= 0 ? "danger" : "warning"}>
                                                                {material.quantity <= 0 ? t("outOfStock") : t("lowStock")}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-xs text-[var(--color-text-muted)]">{t("minimum", { value: number.format(material.minimumStockLevel) })}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-end">
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="sm" variant="secondary" onClick={() => open("IN", material)} aria-label={`${t("addStock")}: ${material.name}`} title={t("addStock")}>
                                                            <Plus className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="sm" variant="secondary" disabled={material.quantity <= 0} onClick={() => open("OUT", material)} aria-label={`${t("useStock")}: ${material.name}`} title={t("useStock")}>
                                                            <Minus className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="sm" variant="secondary" onClick={() => open("ADJUSTMENT", material)} aria-label={`${t("adjustStock")}: ${material.name}`} title={t("adjustStock")}>
                                                            <SlidersHorizontal className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => toggleHistory(material.id)}
                                                            aria-expanded={openHistory === material.id}
                                                            aria-label={`${t("history")}: ${material.name}`}
                                                            title={t("history")}
                                                        >
                                                            <History className="h-4 w-4" />
                                                            <ChevronDown className={`h-3 w-3 transition-transform ${openHistory === material.id ? "rotate-180" : ""}`} />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            {openHistory === material.id && (
                                                <TableRow className="hover:bg-transparent">
                                                    <TableCell colSpan={5} className="bg-[var(--color-bg-tertiary)]">
                                                        {!rows ? (
                                                            <p className="text-sm text-[var(--color-text-muted)]">{t("loading")}</p>
                                                        ) : rows.length === 0 ? (
                                                            <p className="text-sm text-[var(--color-text-muted)]">{t("noHistory")}</p>
                                                        ) : (
                                                            <ul className="divide-y divide-[var(--color-border)] text-sm">
                                                                {rows.slice(0, 15).map((row) => {
                                                                    const signed = row.type === "OUT" ? -row.quantity : row.quantity;
                                                                    return (
                                                                        <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                                                                            <span className="text-[var(--color-text-secondary)]">
                                                                                {formatDisplayDate(row.date, locale)} · {t(`movement.${row.type}`)}
                                                                                {row.notes && <span className="text-[var(--color-text-muted)]"> · {row.notes}</span>}
                                                                            </span>
                                                                            <span className={`font-medium ${signed < 0 ? "text-[var(--color-error)]" : "text-[var(--color-success)]"}`} dir="ltr">
                                                                                {signed > 0 ? "+" : ""}{number.format(signed)}
                                                                            </span>
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </Fragment>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {showAddMaterial && <AddMaterialDialog onClose={() => setShowAddMaterial(false)} onSuccess={handleMaterialAdded} />}

            {dialog && (
                <StockTransactionDialog
                    type={dialog.type}
                    materialId={dialog.materialId}
                    materialName={dialog.materialName}
                    onClose={() => setDialog(null)}
                    onSuccess={handleTransactionSuccess}
                />
            )}
        </div>
    );
}
