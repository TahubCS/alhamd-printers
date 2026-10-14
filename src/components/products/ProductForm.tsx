"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { saveProduct, type ProductInput, type SerializedProduct } from "@/actions/product";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function ProductForm({ product }: { product?: SerializedProduct }) {
    const t = useTranslations("products");
    const tActions = useTranslations("actions");
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({
        code: product?.code ?? "",
        name: product?.name ?? "",
        nameUrdu: product?.nameUrdu ?? "",
        description: product?.description ?? "",
        thickness: product?.thickness ?? "",
        withTape: product?.withTape ?? false,
        withPrint: product?.withPrint ?? false,
        basePrice: product ? String(product.basePrice) : "",
        buttonPrice: product ? String(product.buttonPrice) : "0",
    });

    const text = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
    const toggle = (field: "withTape" | "withPrint") => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [field]: e.target.checked }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const input: ProductInput = { ...form, basePrice: form.basePrice, buttonPrice: form.buttonPrice || 0 };
        const result = await saveProduct(product?.id ?? null, input);
        setBusy(false);
        if (!result.success) {
            setError(result.error ?? t("genericError"));
            return;
        }
        router.push("/products");
        router.refresh();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <CardContent className="grid gap-5 p-6 sm:grid-cols-2">
                    {error && (
                        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300 sm:col-span-2">
                            {error}
                        </p>
                    )}
                    <Input id="product-code" label={t("code")} value={form.code} onChange={text("code")} placeholder="SC-825" required dir="ltr" />
                    <Input id="product-thickness" label={t("thickness")} value={form.thickness} onChange={text("thickness")} placeholder="9MM" />
                    <Input id="product-name" label={t("name")} value={form.name} onChange={text("name")} required />
                    <Input id="product-name-ur" label={t("nameUrdu")} value={form.nameUrdu} onChange={text("nameUrdu")} dir="rtl" />
                    <Input
                        id="product-price"
                        type="number"
                        min="0"
                        step="0.01"
                        label={t("basePrice")}
                        value={form.basePrice}
                        onChange={text("basePrice")}
                        required
                    />
                    <Input
                        id="product-button-price"
                        type="number"
                        min="0"
                        step="0.01"
                        label={t("buttonPrice")}
                        value={form.buttonPrice}
                        onChange={text("buttonPrice")}
                    />
                    <div className="sm:col-span-2">
                        <label htmlFor="product-description" className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
                            {t("description")}
                        </label>
                        <textarea id="product-description" className="input min-h-24" value={form.description} onChange={text("description")} />
                    </div>
                    <fieldset className="flex flex-wrap gap-6 sm:col-span-2">
                        <legend className="sr-only">{t("specs")}</legend>
                        <label className="flex cursor-pointer items-center gap-2 text-[var(--color-text-primary)]">
                            <input type="checkbox" className="h-4 w-4 accent-[var(--color-accent-primary)]" checked={form.withTape} onChange={toggle("withTape")} />
                            {t("withTape")}
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-[var(--color-text-primary)]">
                            <input type="checkbox" className="h-4 w-4 accent-[var(--color-accent-primary)]" checked={form.withPrint} onChange={toggle("withPrint")} />
                            {t("withPrint")}
                        </label>
                    </fieldset>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>{tActions("cancel")}</Button>
                <Button type="submit" isLoading={busy}>{tActions("save")}</Button>
            </div>
        </form>
    );
}
