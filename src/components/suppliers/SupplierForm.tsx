"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { saveSupplier } from "@/actions/supplier";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

interface SupplierValues {
    id: string;
    name: string;
    nameUrdu: string | null;
    phone: string | null;
    address: string | null;
    notes: string | null;
}

export default function SupplierForm({ supplier }: { supplier?: SupplierValues }) {
    const t = useTranslations("suppliers");
    const tActions = useTranslations("actions");
    const router = useRouter();
    const [form, setForm] = useState({
        name: supplier?.name ?? "",
        nameUrdu: supplier?.nameUrdu ?? "",
        phone: supplier?.phone ?? "",
        address: supplier?.address ?? "",
        notes: supplier?.notes ?? "",
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const result = await saveSupplier(supplier?.id ?? null, form);
        setBusy(false);
        if (!result.success || !result.data) {
            setError(result.error ?? t("genericError"));
            return;
        }
        router.push(`/suppliers/${result.data.id}`);
        router.refresh();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <CardContent className="grid gap-5 p-6 sm:grid-cols-2">
                    {error && (
                        <p role="alert" className="rounded-lg border border-[#F3C3BE] bg-[var(--color-error-soft)] px-4 py-3 text-sm text-[var(--color-error)] sm:col-span-2">{error}</p>
                    )}
                    <Input id="supplier-name" label={t("name")} value={form.name} onChange={update("name")} required />
                    <Input id="supplier-name-ur" label={t("nameUrdu")} value={form.nameUrdu} onChange={update("nameUrdu")} dir="rtl" />
                    <Input id="supplier-phone" label={t("phone")} value={form.phone} onChange={update("phone")} dir="ltr" />
                    <Input id="supplier-address" label={t("address")} value={form.address} onChange={update("address")} />
                    <div className="sm:col-span-2">
                        <Input id="supplier-notes" label={t("notes")} value={form.notes} onChange={update("notes")} />
                    </div>
                </CardContent>
            </Card>
            <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>{tActions("cancel")}</Button>
                <Button type="submit" isLoading={busy}>{tActions("save")}</Button>
            </div>
        </form>
    );
}
