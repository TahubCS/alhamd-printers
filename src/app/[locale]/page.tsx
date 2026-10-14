import { getTranslations } from "next-intl/server";
import type { LucideIcon } from "lucide-react";
import {
    AlertTriangle,
    ArrowUpRight,
    CreditCard,
    FileText,
    Factory,
    PackageX,
    Plus,
    Receipt,
    ShoppingCart,
    TrendingUp,
    Truck,
    Users,
    Wallet,
} from "lucide-react";
import { getDashboardData } from "@/actions/dashboard";
import TrendChart from "@/components/dashboard/TrendChart";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Link } from "@/i18n/navigation";
import { formatPKR } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface KpiProps {
    label: string;
    value: string;
    detail: string;
    href: string;
    icon: LucideIcon;
    tone?: "default" | "warning" | "danger";
}

function Kpi({ label, value, detail, href, icon: Icon, tone = "default" }: KpiProps) {
    const toneClass = tone === "danger" ? "text-red-300" : tone === "warning" ? "text-amber-300" : "text-[var(--color-text-primary)]";
    return (
        <Link href={href} className="stat-card group block p-5 focus-visible:outline-none">
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
                <Icon className="h-5 w-5 shrink-0 text-[var(--color-accent-primary)]" aria-hidden="true" />
            </div>
            <p className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{detail}</p>
        </Link>
    );
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations("dashboard");
    const { data } = await getDashboardData();

    const quickActions = [
        { href: "/invoices/new", label: t("actions.invoice"), icon: FileText },
        { href: "/purchase-orders/new", label: t("actions.order"), icon: ShoppingCart },
        { href: "/challans/new", label: t("actions.challan"), icon: Truck },
        { href: "/expenses/new", label: t("actions.expense"), icon: Receipt },
        { href: "/suppliers/purchases/new", label: t("actions.purchase"), icon: Factory },
    ];

    return (
        <div className="animate-fade-in space-y-8 p-3 rtl:p-4">
            <header className="space-y-5">
                <div className="max-w-3xl">
                    <p className="mb-3 text-sm font-semibold uppercase tracking-[.18em] text-[var(--color-accent-primary)] rtl:tracking-normal">{t("eyebrow")}</p>
                    <h1 className="text-3xl font-bold leading-tight text-[var(--color-text-primary)] sm:text-4xl rtl:leading-snug">{t("welcome")}</h1>
                    <p className="mt-3 text-base text-[var(--color-text-secondary)] sm:text-lg">{t("subtitle")}</p>
                </div>
                <nav aria-label={t("quickActions")} className="flex flex-wrap gap-2">
                    {quickActions.map(({ href, label, icon: Icon }) => (
                        <Link key={href} href={href} className="btn btn-secondary px-3 py-2 text-sm">
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            <Icon className="h-4 w-4" aria-hidden="true" />
                            {label}
                        </Link>
                    ))}
                </nav>
            </header>

            {!data ? (
                <Card className="p-6">
                    <p role="alert" className="text-[var(--color-text-secondary)]">{t("loadError")}</p>
                </Card>
            ) : (
                <>
                    <section aria-label={t("kpiLabel")} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                        <Kpi
                            label={t("kpi.receivables")}
                            value={formatPKR(data.kpis.receivables, locale)}
                            detail={t("kpi.customersOwing", { count: data.kpis.customersOwing, total: data.kpis.customerCount })}
                            href="/customers"
                            icon={Users}
                        />
                        <Kpi
                            label={t("kpi.overdue")}
                            value={String(data.kpis.overdueCount)}
                            detail={t("kpi.overdueDetail")}
                            href="/invoices?status=OVERDUE"
                            icon={AlertTriangle}
                            tone={data.kpis.overdueCount > 0 ? "danger" : "default"}
                        />
                        <Kpi
                            label={t("kpi.cheques")}
                            value={formatPKR(data.kpis.pendingCheques, locale)}
                            detail={t("kpi.chequesDetail", { count: data.kpis.pendingChequeCount })}
                            href="/cheques"
                            icon={CreditCard}
                        />
                        <Kpi
                            label={t("kpi.sales")}
                            value={formatPKR(data.kpis.salesThisMonth, locale)}
                            detail={t("kpi.thisMonth")}
                            href="/invoices"
                            icon={TrendingUp}
                        />
                        <Kpi
                            label={t("kpi.expenses")}
                            value={formatPKR(data.kpis.expensesThisMonth, locale)}
                            detail={t("kpi.thisMonth")}
                            href="/expenses"
                            icon={Wallet}
                        />
                        <Kpi
                            label={t("kpi.payables")}
                            value={formatPKR(data.kpis.payables, locale)}
                            detail={t("kpi.suppliersOwed", { count: data.kpis.suppliersOwed })}
                            href="/suppliers"
                            icon={Factory}
                            tone={data.kpis.payables > 0 ? "warning" : "default"}
                        />
                    </section>

                    <div className="grid grid-cols-1 lg:grid-cols-3">
                        <Card className="p-5 sm:p-6 lg:col-span-2">
                            <CardHeader className="mb-2 p-0">
                                <CardTitle className="text-lg text-[var(--color-text-primary)]">{t("trend.title")}</CardTitle>
                                <p className="text-sm text-[var(--color-text-secondary)]">{t("trend.subtitle")}</p>
                            </CardHeader>
                            <CardContent className="p-0">
                                <TrendChart data={data.trend} />
                            </CardContent>
                        </Card>

                        <Card className="p-5 sm:p-6">
                            <CardHeader className="mb-4 flex-row items-center justify-between space-y-0 p-0">
                                <CardTitle className="text-lg text-[var(--color-text-primary)]">{t("lowStock.title")}</CardTitle>
                                <Link href="/inventory" className="text-sm text-[var(--color-accent-primary)] hover:underline">{t("viewAll")}</Link>
                            </CardHeader>
                            <CardContent className="p-0">
                                {data.lowStock.length === 0 ? (
                                    <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">{t("lowStock.none")}</p>
                                ) : (
                                    <ul className="divide-y divide-[var(--color-border)]">
                                        {data.lowStock.slice(0, 6).map((item) => (
                                            <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                                                <span className="flex min-w-0 items-start gap-2 text-sm text-[var(--color-text-primary)]">
                                                    <PackageX className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                                                    <span>{item.name}</span>
                                                </span>
                                                <Badge variant={item.quantity <= 0 ? "danger" : "warning"}>
                                                    {t("lowStock.level", { quantity: item.quantity, minimum: item.minimum })}
                                                </Badge>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="p-5 sm:p-6">
                        <CardHeader className="mb-4 flex-row items-center justify-between space-y-0 p-0">
                            <CardTitle className="text-lg text-[var(--color-text-primary)]">{t("overdue.title")}</CardTitle>
                            <Link href="/invoices?status=OVERDUE" className="text-sm text-[var(--color-accent-primary)] hover:underline">{t("viewAll")}</Link>
                        </CardHeader>
                        <CardContent className="p-0">
                            {data.overdue.length === 0 ? (
                                <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">{t("overdue.none")}</p>
                            ) : (
                                <ul className="divide-y divide-[var(--color-border)]">
                                    {data.overdue.map((inv) => (
                                        <li key={inv.id}>
                                            <Link href={`/invoices/${inv.id}`} className="flex items-center justify-between gap-4 py-3 hover:bg-[var(--color-bg-hover)] sm:px-2">
                                                <span className="min-w-0">
                                                    <span className="block font-medium text-[var(--color-text-primary)]">{inv.customer.name}</span>
                                                    <span className="text-xs text-[var(--color-text-muted)]">
                                                        {t("overdue.invoice", { number: inv.invoiceNo })} · {t("overdue.days", { count: inv.daysOverdue })}
                                                    </span>
                                                </span>
                                                <span className="flex shrink-0 items-center gap-2 font-semibold text-[var(--color-text-primary)]">
                                                    {formatPKR(inv.total, locale)}
                                                    <ArrowUpRight className="h-4 w-4 text-[var(--color-text-muted)] rtl:-scale-x-100" aria-hidden="true" />
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
