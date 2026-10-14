"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { deleteCompany, saveCompany, setDefaultCompany, type CompanyInput } from "@/actions/settings";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export interface CompanyRow {
    id: string;
    name: string;
    nameUrdu: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    logoUrl: string | null;
    isDefault: boolean;
    invoiceCount: number;
}

const EMPTY: CompanyInput = { name: "", nameUrdu: "", address: "", phone: "", email: "", website: "", logoUrl: "" };
const MAX_LOGO_BYTES = 200 * 1024;

export default function CompanySettings({ companies }: { companies: CompanyRow[] }) {
    const t = useTranslations("settings.companies");
    const tActions = useTranslations("actions");
    const router = useRouter();
    const [editingId, setEditingId] = useState<string | "new" | null>(null);
    const [form, setForm] = useState<CompanyInput>(EMPTY);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const startEdit = (company?: CompanyRow) => {
        setError(null);
        if (!company) {
            setForm(EMPTY);
            setEditingId("new");
            return;
        }
        setForm({
            name: company.name,
            nameUrdu: company.nameUrdu ?? "",
            address: company.address ?? "",
            phone: company.phone ?? "",
            email: company.email ?? "",
            website: company.website ?? "",
            logoUrl: company.logoUrl ?? "",
        });
        setEditingId(company.id);
    };

    const update = (field: keyof CompanyInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > MAX_LOGO_BYTES) {
            setError(t("logoTooLarge"));
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setForm((prev) => ({ ...prev, logoUrl: String(reader.result) }));
        reader.readAsDataURL(file);
    };

    const run = async (action: () => Promise<{ success: boolean; error?: string }>) => {
        setBusy(true);
        setError(null);
        const result = await action();
        setBusy(false);
        if (!result.success) {
            setError(result.error ?? t("genericError"));
            return false;
        }
        router.refresh();
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const ok = await run(() => saveCompany(editingId === "new" ? null : editingId, form));
        if (ok) setEditingId(null);
    };

    return (
        <Card className="p-4 sm:p-6 sm:rtl:p-7">
            <CardHeader className="mb-6 flex-col items-start gap-4 space-y-0 p-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle className="text-xl text-[var(--color-text-primary)]">{t("title")}</CardTitle>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{t("description")}</p>
                </div>
                {editingId === null && (
                    <Button size="sm" onClick={() => startEdit()}>
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        {t("add")}
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-4 p-0">
                {error && (
                    <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                    </p>
                )}

                {editingId !== null && (
                    <form onSubmit={handleSubmit} className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-5 sm:grid-cols-2">
                        <Input id="company-name" label={t("name")} value={form.name} onChange={update("name")} required />
                        <Input id="company-name-ur" label={t("nameUrdu")} value={form.nameUrdu ?? ""} onChange={update("nameUrdu")} dir="rtl" />
                        <Input id="company-phone" label={t("phone")} value={form.phone ?? ""} onChange={update("phone")} />
                        <Input id="company-email" type="email" label={t("email")} value={form.email ?? ""} onChange={update("email")} />
                        <div className="sm:col-span-2">
                            <Input id="company-address" label={t("address")} value={form.address ?? ""} onChange={update("address")} />
                        </div>
                        <Input id="company-website" label={t("website")} value={form.website ?? ""} onChange={update("website")} />
                        <div>
                            <Label htmlFor="company-logo" className="mb-2 block text-[var(--color-text-primary)]">{t("logo")}</Label>
                            <div className="flex items-center gap-3">
                                {form.logoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={form.logoUrl} alt="" className="h-11 w-11 rounded-lg bg-white object-contain p-1" />
                                ) : (
                                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-bg-hover)]">
                                        <Building2 className="h-5 w-5 text-[var(--color-text-muted)]" aria-hidden="true" />
                                    </span>
                                )}
                                <input id="company-logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogo} className="text-sm text-[var(--color-text-secondary)] file:me-3 file:rounded-lg file:border-0 file:bg-[var(--color-bg-hover)] file:px-3 file:py-2 file:text-[var(--color-text-primary)]" />
                                {form.logoUrl && (
                                    <Button type="button" size="sm" variant="ghost" onClick={() => setForm((prev) => ({ ...prev, logoUrl: "" }))} aria-label={t("removeLogo")}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            <p className="mt-2 text-xs text-[var(--color-text-muted)]">{t("logoHint")}</p>
                        </div>
                        <div className="flex justify-end gap-3 sm:col-span-2">
                            <Button type="button" variant="outline" onClick={() => setEditingId(null)}>{tActions("cancel")}</Button>
                            <Button type="submit" isLoading={busy}>{tActions("save")}</Button>
                        </div>
                    </form>
                )}

                {companies.length === 0 && editingId === null ? (
                    <p className="py-8 text-center text-[var(--color-text-muted)]">{t("empty")}</p>
                ) : (
                    <ul className="divide-y divide-[var(--color-border)]">
                        {companies.map((company) => (
                            <li key={company.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 items-center gap-3">
                                    {company.logoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={company.logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-white object-contain p-1" />
                                    ) : (
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-hover)]">
                                            <Building2 className="h-5 w-5 text-[var(--color-accent-primary)]" aria-hidden="true" />
                                        </span>
                                    )}
                                    <div className="min-w-0">
                                        <p className="flex flex-wrap items-center gap-2 font-medium text-[var(--color-text-primary)]">
                                            {company.name}
                                            {company.isDefault && <Badge variant="success">{t("default")}</Badge>}
                                        </p>
                                        <p className="truncate text-sm text-[var(--color-text-secondary)]">
                                            {/* bdi keeps phone numbers from being reordered next to Urdu text */}
                                            {[company.nameUrdu, company.phone, company.email].filter(Boolean).map((part, i) => (
                                                <span key={i}>{i > 0 && " · "}<bdi>{part}</bdi></span>
                                            ))}
                                        </p>
                                        <p className="text-xs text-[var(--color-text-muted)]">{t("invoiceCount", { count: company.invoiceCount })}</p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                    {!company.isDefault && (
                                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => setDefaultCompany(company.id))}>
                                            <Star className="h-4 w-4" aria-hidden="true" />
                                            {t("makeDefault")}
                                        </Button>
                                    )}
                                    <Button size="sm" variant="secondary" onClick={() => startEdit(company)} aria-label={`${tActions("edit")} ${company.name}`}>
                                        <Pencil className="h-4 w-4" aria-hidden="true" />
                                    </Button>
                                    {!company.isDefault && company.invoiceCount === 0 && (
                                        <Button
                                            size="sm"
                                            variant="danger"
                                            disabled={busy}
                                            aria-label={`${tActions("delete")} ${company.name}`}
                                            onClick={() => window.confirm(t("confirmDelete", { name: company.name })) && run(() => deleteCompany(company.id))}
                                        >
                                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                                        </Button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
