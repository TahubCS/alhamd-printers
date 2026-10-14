"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { recordSupplierPayment } from "@/actions/supplier";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

type Method = "CASH" | "CHEQUE" | "BANK_TRANSFER";

export default function SupplierPaymentForm({ supplierId }: { supplierId: string }) {
    const t = useTranslations("suppliers");
    const tPayments = useTranslations("payments");
    const router = useRouter();
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState<Method>("CASH");
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [reference, setReference] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const result = await recordSupplierPayment({ supplierId, amount, method, date, reference });
        setBusy(false);
        if (!result.success) {
            setError(result.error ?? t("genericError"));
            return;
        }
        setAmount("");
        setReference("");
        router.refresh();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
            <Input id="pay-amount" type="number" min="0.01" step="0.01" label={tPayments("amount")} value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <div>
                <Label htmlFor="pay-method" className="mb-2 block text-[var(--color-text-primary)]">{tPayments("method")}</Label>
                <select id="pay-method" className="input" value={method} onChange={(e) => setMethod(e.target.value as Method)}>
                    <option value="CASH">{tPayments("cash")}</option>
                    <option value="CHEQUE">{tPayments("cheque")}</option>
                    <option value="BANK_TRANSFER">{tPayments("bankTransfer")}</option>
                </select>
            </div>
            <Input id="pay-date" type="date" label={t("date")} value={date} onChange={(e) => setDate(e.target.value)} required />
            {method !== "CASH" && (
                <Input id="pay-ref" label={t("reference")} value={reference} onChange={(e) => setReference(e.target.value)} dir="ltr" />
            )}
            <Button type="submit" className="w-full" isLoading={busy}>{t("recordPayment")}</Button>
        </form>
    );
}
