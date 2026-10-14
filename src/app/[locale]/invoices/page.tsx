import { getInvoices } from "@/actions/invoice";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/Table";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ companyId?: string; status?: string }>;
}

export default async function InvoicesPage({ params, searchParams }: PageProps) {
    const { locale } = await params;
    const { companyId, status } = await searchParams;
    const t = await getTranslations("invoices");
    const tActions = await getTranslations("actions");

    const { success, data: invoices, error } = await getInvoices({
        companyId,
        status,
    });

    if (!success || !invoices) {
        console.error(error);
    }

    const isUrdu = locale === 'ur';

    return (
        <div className="animate-fade-in" style={{ padding: isUrdu ? '16px' : '12px' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ marginBottom: isUrdu ? '48px' : '40px' }}>
                <div>
                    <h1
                        className="font-bold text-[var(--color-text-primary)]"
                        style={{
                            fontSize: isUrdu ? '2.5rem' : '2rem',
                            marginBottom: isUrdu ? '16px' : '12px',
                            lineHeight: isUrdu ? '1.4' : '1.2'
                        }}
                    >
                        {t("title")}
                    </h1>
                    <p
                        className="text-[var(--color-text-secondary)]"
                        style={{
                            fontSize: isUrdu ? '1.2rem' : '1.1rem',
                            lineHeight: isUrdu ? '1.8' : '1.5'
                        }}
                    >
                        {t("subtitle")}
                    </p>
                </div>
                <Link href={`/${locale}/invoices/new`}>
                    <Button>{t("newInvoice")}</Button>
                </Link>
            </div>

            <nav aria-label={t("statusLabel")} className="mb-6 flex flex-wrap gap-2">
                {[undefined, "PENDING", "PARTIAL", "OVERDUE", "PAID", "BAD_DEBT"].map((value) => {
                    const active = (status ?? undefined) === value;
                    return (
                        <Link
                            key={value ?? "all"}
                            href={value ? `/${locale}/invoices?status=${value}` : `/${locale}/invoices`}
                            aria-current={active ? "page" : undefined}
                            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${active
                                ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/15 text-[var(--color-text-primary)]"
                                : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-light)]"}`}
                        >
                            {value ? t(`status.${value}`) : t("filterAll")}
                        </Link>
                    );
                })}
            </nav>

            <Card className="card" style={{ padding: isUrdu ? '28px' : '24px' }}>
                <CardHeader className="p-0 mb-6">
                    <CardTitle className="text-xl text-[var(--color-text-primary)]">{t("recentInvoices")}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>{t("date")}</TableHead>
                                <TableHead>{t("customer")}</TableHead>
                                <TableHead>{t("company")}</TableHead>
                                <TableHead className="text-end">{t("amount")}</TableHead>
                                <TableHead>{t("statusLabel")}</TableHead>
                                <TableHead className="text-end">{t("actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices && invoices.length > 0 ? (
                                invoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-medium text-[var(--color-text-primary)]">
                                            {invoice.invoiceNo}
                                        </TableCell>
                                        <TableCell className="text-[var(--color-text-secondary)]">
                                            {new Date(invoice.date).toLocaleDateString(
                                                locale === "ur" ? "ur-PK" : "en-PK"
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-[var(--color-text-primary)]">{invoice.customer?.name || "—"}</div>
                                            <div className="text-xs text-[var(--color-text-muted)] font-noto-nastaliq">
                                                {invoice.customer?.nameUrdu}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-[var(--color-text-secondary)]">
                                            {invoice.company?.name || "—"}
                                        </TableCell>
                                        <TableCell className="text-end font-medium text-[var(--color-text-primary)]">
                                            {new Intl.NumberFormat(locale === "ur" ? "ur-PK" : "en-PK", {
                                                style: "currency",
                                                currency: "PKR",
                                            }).format(Number(invoice.total))}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                invoice.status === 'PAID' ? 'success' :
                                                    invoice.status === 'OVERDUE' ? 'danger' :
                                                        invoice.status === 'PARTIAL' ? 'warning' : 'default'
                                            }>
                                                {t(`status.${invoice.status}`)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-end">
                                            <Link href={`/${locale}/invoices/${invoice.id}`}>
                                                <Button size="sm" variant="secondary">
                                                    {tActions("view")}
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-[var(--color-text-muted)]">
                                        {t("noInvoices")}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
