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


    return (
        <div className="animate-fade-in">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold leading-8 tracking-tight text-[var(--color-text-primary)] rtl:leading-10">
                        {t("title")}
                    </h1>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        {t("subtitle")}
                    </p>
                </div>
                <Link href={`/${locale}/invoices/new`}>
                    <Button>{t("newInvoice")}</Button>
                </Link>
            </div>

            <nav aria-label={t("statusLabel")} className="mb-4 inline-flex flex-wrap gap-0.5 rounded-md bg-[var(--color-neutral-soft)] p-0.5">
                {[undefined, "PENDING", "PARTIAL", "OVERDUE", "PAID", "BAD_DEBT"].map((value) => {
                    const active = (status ?? undefined) === value;
                    return (
                        <Link
                            key={value ?? "all"}
                            href={value ? `/${locale}/invoices?status=${value}` : `/${locale}/invoices`}
                            aria-current={active ? "page" : undefined}
                            className={`inline-flex h-8 items-center rounded px-3 text-[13px] font-medium transition-colors ${active
                                ? "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-[var(--shadow-sm)]"
                                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}
                        >
                            {value ? t(`status.${value}`) : t("filterAll")}
                        </Link>
                    );
                })}
            </nav>

            <Card className="overflow-hidden">
                <CardHeader className="border-b border-[var(--color-border)] px-5 py-3.5">
                    <CardTitle className="text-[var(--color-text-primary)]">{t("recentInvoices")}</CardTitle>
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
