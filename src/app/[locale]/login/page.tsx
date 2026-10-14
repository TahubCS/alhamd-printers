import { getTranslations, setRequestLocale } from "next-intl/server";
import { Printer, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import LanguageToggle from "@/components/layout/LanguageToggle";
import { getConfiguredCredentials, isDemoMode } from "@/lib/auth/credentials";
import { getAuthSecret, safeRedirectPath } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const ERROR_KEYS = ["invalid", "throttled", "config"] as const;

interface PageProps {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function LoginPage({ params, searchParams }: PageProps) {
    const { locale } = await params;
    const { error, next } = await searchParams;
    setRequestLocale(locale);
    const t = await getTranslations("auth");

    const credentials = getConfiguredCredentials();
    const configured = Boolean(credentials && getAuthSecret());
    const errorKey = ERROR_KEYS.find((key) => key === error) ?? (configured ? null : "config");
    const demo = isDemoMode() && credentials;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
            <div className="w-full max-w-md animate-fade-in">
                <div className="flex justify-end mb-6">
                    <LanguageToggle />
                </div>

                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] flex items-center justify-center mb-4">
                        <Printer className="w-7 h-7 text-white" aria-hidden="true" />
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t("title")}</h1>
                    <p className="mt-2 text-[var(--color-text-secondary)]">{t("subtitle")}</p>
                </div>

                <div className="card p-6 sm:p-8">
                    {errorKey && (
                        <p role="alert" className="mb-5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                            {t(`errors.${errorKey}`)}
                        </p>
                    )}

                    <form method="post" action="/api/auth/login" className="space-y-5">
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="next" value={safeRedirectPath(next, `/${locale}`)} />
                        <Input
                            id="username"
                            name="username"
                            label={t("username")}
                            autoComplete="username"
                            defaultValue={demo ? credentials.username : undefined}
                            required
                            autoFocus
                        />
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            label={t("password")}
                            autoComplete="current-password"
                            required
                        />
                        <Button type="submit" className="w-full" disabled={!configured}>
                            <LogIn className="w-4 h-4 rtl:-scale-x-100" aria-hidden="true" />
                            {t("submit")}
                        </Button>
                    </form>

                    {demo && (
                        <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-4 py-3 text-sm">
                            <p className="font-medium text-[var(--color-text-primary)]">{t("demoTitle")}</p>
                            <p className="mt-1 text-[var(--color-text-secondary)]">{t("demoNotice")}</p>
                            <p className="mt-2 font-mono text-[var(--color-text-primary)]" dir="ltr">
                                {credentials.username} / {credentials.password}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
