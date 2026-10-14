"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { createChallan, getPODeliveryStatus } from "@/actions/challan";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

interface CustomerOption {
    id: string;
    name: string;
    nameUrdu: string | null;
}

interface POOption {
    id: string;
    poNumber: string | null;
    customerId: string;
    date: string;
}

interface Line {
    description: string;
    quantity: string;
    unit: string;
    customerPurchaseOrderItemId?: string;
    remaining?: number;
}

const blankLine = (): Line => ({ description: "", quantity: "", unit: "Pieces" });

export default function ChallanForm({
    customers,
    purchaseOrders,
    initialPoId,
}: {
    customers: CustomerOption[];
    purchaseOrders: POOption[];
    initialPoId?: string;
}) {
    const t = useTranslations("challans");
    const tActions = useTranslations("actions");
    const router = useRouter();
    const initialPo = purchaseOrders.find((po) => po.id === initialPoId);

    const [customerId, setCustomerId] = useState(initialPo?.customerId ?? "");
    const [poId, setPoId] = useState(initialPo?.id ?? "");
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [vehicleNo, setVehicleNo] = useState("");
    const [driverName, setDriverName] = useState("");
    const [notes, setNotes] = useState("");
    const [lines, setLines] = useState<Line[]>([blankLine()]);
    const [loadingPo, setLoadingPo] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const customerPOs = purchaseOrders.filter((po) => po.customerId === customerId);

    // Selecting a PO fills the lines with what is still left to deliver
    useEffect(() => {
        if (!poId) return;
        let cancelled = false;
        getPODeliveryStatus(poId).then((result) => {
            if (cancelled) return;
            setLoadingPo(false);
            if (!result.success || !result.data) {
                setError(result.error ?? t("genericError"));
                return;
            }
            const open = result.data.lines.filter((line) => line.remaining > 0);
            setLines(
                open.length > 0
                    ? open.map((line) => ({
                        description: line.description,
                        quantity: String(line.remaining),
                        unit: line.unit,
                        customerPurchaseOrderItemId: line.id,
                        remaining: line.remaining,
                    }))
                    : [blankLine()]
            );
            if (open.length === 0) setError(t("poFullyDelivered"));
        });
        return () => {
            cancelled = true;
        };
    }, [poId, t]);

    const choosePo = (id: string) => {
        setError(null);
        setPoId(id);
        if (id) {
            setLoadingPo(true);
        } else {
            setLines([blankLine()]);
        }
    };

    const chooseCustomer = (id: string) => {
        setCustomerId(id);
        choosePo("");
    };

    const updateLine = (index: number, field: keyof Line, value: string) =>
        setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const result = await createChallan({
            customerId,
            date,
            customerPurchaseOrderId: poId || undefined,
            vehicleNo,
            driverName,
            notes,
            items: lines.map((line) => ({
                description: line.description,
                quantity: line.quantity,
                unit: line.unit,
                customerPurchaseOrderItemId: line.customerPurchaseOrderItemId,
            })),
        });
        setBusy(false);
        if (!result.success || !result.data) {
            setError(result.error ?? t("genericError"));
            return;
        }
        router.push(`/challans/${result.data.id}`);
        router.refresh();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                </p>
            )}

            <Card>
                <CardContent className="grid gap-5 p-6 sm:grid-cols-2">
                    <div>
                        <Label htmlFor="challan-customer" className="mb-2 block text-[var(--color-text-primary)]">{t("customer")}</Label>
                        <select id="challan-customer" className="input" value={customerId} onChange={(e) => chooseCustomer(e.target.value)} required>
                            <option value="">{t("selectCustomer")}</option>
                            {customers.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}{c.nameUrdu ? ` (${c.nameUrdu})` : ""}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="challan-po" className="mb-2 block text-[var(--color-text-primary)]">{t("poOptional")}</Label>
                        <select id="challan-po" className="input" value={poId} onChange={(e) => choosePo(e.target.value)} disabled={!customerId || loadingPo}>
                            <option value="">{customerPOs.length ? t("noPo") : t("noOpenPos")}</option>
                            {customerPOs.map((po) => (
                                <option key={po.id} value={po.id}>{po.poNumber || po.id.slice(-6)}</option>
                            ))}
                        </select>
                    </div>
                    <Input id="challan-date" type="date" label={t("date")} value={date} onChange={(e) => setDate(e.target.value)} required />
                    <Input id="challan-vehicle" label={t("vehicle")} value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="KHI-1234" dir="ltr" />
                    <Input id="challan-driver" label={t("driver")} value={driverName} onChange={(e) => setDriverName(e.target.value)} />
                    <Input id="challan-notes" label={t("notes")} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </CardContent>
            </Card>

            <Card>
                <CardContent className="space-y-4 p-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t("items")}</h2>
                        {!poId && (
                            <Button type="button" size="sm" variant="outline" onClick={() => setLines((prev) => [...prev, blankLine()])}>
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                {t("addLine")}
                            </Button>
                        )}
                    </div>

                    {lines.map((line, index) => (
                        <div key={index} className="grid gap-3 rounded-xl border border-[var(--color-border)] p-4 sm:grid-cols-[1fr_8rem_8rem_auto] sm:items-start">
                            <Input
                                id={`line-${index}-desc`}
                                label={t("description")}
                                value={line.description}
                                onChange={(e) => updateLine(index, "description", e.target.value)}
                                readOnly={Boolean(line.customerPurchaseOrderItemId)}
                                required
                            />
                            <div>
                                <Input
                                    id={`line-${index}-qty`}
                                    type="number"
                                    min="1"
                                    step="1"
                                    max={line.remaining}
                                    label={t("quantity")}
                                    value={line.quantity}
                                    onChange={(e) => updateLine(index, "quantity", e.target.value)}
                                    required
                                />
                                {line.remaining !== undefined && (
                                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">{t("remaining", { count: line.remaining })}</p>
                                )}
                            </div>
                            <Input id={`line-${index}-unit`} label={t("unit")} value={line.unit} onChange={(e) => updateLine(index, "unit", e.target.value)} />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-400 sm:mt-9"
                                disabled={lines.length === 1}
                                onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                                aria-label={t("removeLine")}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>{tActions("cancel")}</Button>
                <Button type="submit" isLoading={busy} disabled={loadingPo}>{t("save")}</Button>
            </div>
        </form>
    );
}
