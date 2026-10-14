"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Landmark, Plus, ShieldCheck } from "lucide-react";
import { createBankAccount, setBankAccountActive, type BankAccountInput } from "@/actions/settings";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export interface BankAccountRow {
    id: string;
    bankName: string;
    accountTitle: string;
    accountNumberMasked: string;
    isActive: boolean;
    paymentCount: number;
}

const EMPTY: BankAccountInput = { bankName: "", accountTitle: "", lastFourDigits: "" };

export default function BankAccountSettings({ accounts }: { accounts: BankAccountRow[] }) {
    const t = useTranslations("settings.banks");
    const tActions = useTranslations("actions");
    const router = useRouter();
    const [adding, setAdding] = useState(false);
    const [form, setForm] = useState<BankAccountInput>(EMPTY);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const update = (field: keyof BankAccountInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

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
        if (await run(() => createBankAccount(form))) {
            setForm(EMPTY);
            setAdding(false);
        }
    };

    return (
        <Card className="p-4 sm:p-6 sm:rtl:p-7">
            <CardHeader className="mb-6 flex-col items-start gap-4 space-y-0 p-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle className="text-[var(--color-text-primary)]">{t("title")}</CardTitle>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{t("description")}</p>
                </div>
                {!adding && (
                    <Button size="sm" onClick={() => setAdding(true)}>
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        {t("add")}
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-4 p-0">
                {error && (
                    <p role="alert" className="rounded-lg border border-[#F3C3BE] bg-[var(--color-error-soft)] px-4 py-3 text-sm text-[var(--color-error)]">
                        {error}
                    </p>
                )}

                {adding && (
                    <form onSubmit={handleSubmit} className="grid gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-5 sm:grid-cols-3">
                        <Input id="bank-name" label={t("bankName")} placeholder="HBL" value={form.bankName} onChange={update("bankName")} required />
                        <Input id="bank-title" label={t("accountTitle")} value={form.accountTitle} onChange={update("accountTitle")} required />
                        <Input
                            id="bank-last4"
                            label={t("lastFour")}
                            inputMode="numeric"
                            pattern="\d{4}"
                            maxLength={4}
                            placeholder="1234"
                            value={form.lastFourDigits}
                            onChange={update("lastFourDigits")}
                            required
                            dir="ltr"
                        />
                        <p className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] sm:col-span-3">
                            <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--color-success)]" aria-hidden="true" />
                            {t("securityNote")}
                        </p>
                        <div className="flex justify-end gap-3 sm:col-span-3">
                            <Button type="button" variant="outline" onClick={() => setAdding(false)}>{tActions("cancel")}</Button>
                            <Button type="submit" isLoading={busy}>{tActions("save")}</Button>
                        </div>
                    </form>
                )}

                {accounts.length === 0 && !adding ? (
                    <p className="py-8 text-center text-[var(--color-text-muted)]">{t("empty")}</p>
                ) : (
                    <ul className="divide-y divide-[var(--color-border)]">
                        {accounts.map((account) => (
                            <li key={account.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-hover)]">
                                        <Landmark className="h-5 w-5 text-[var(--color-accent-primary)]" aria-hidden="true" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="flex flex-wrap items-center gap-2 font-medium text-[var(--color-text-primary)]">
                                            {account.bankName}
                                            <span className="font-mono text-sm text-[var(--color-text-secondary)]" dir="ltr">{account.accountNumberMasked}</span>
                                            {!account.isActive && <Badge variant="warning">{t("inactive")}</Badge>}
                                        </p>
                                        <p className="truncate text-sm text-[var(--color-text-secondary)]">{account.accountTitle}</p>
                                        <p className="text-xs text-[var(--color-text-muted)]">{t("paymentCount", { count: account.paymentCount })}</p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant={account.isActive ? "outline" : "secondary"}
                                    disabled={busy}
                                    onClick={() => run(() => setBankAccountActive(account.id, !account.isActive))}
                                >
                                    {account.isActive ? t("deactivate") : t("activate")}
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
