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
    const tCommon = await getTranslations("common");

    const { success, data: invoices, error } = await getInvoices({
        companyId,
        status,
    });

    if (!success || !invoices) {
        console.error(error);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                    <p className="text-muted-foreground">{t("subtitle")}</p>
                </div>
                <Link href={`/${locale}/invoices/new`}>
                    <Button>{t("newInvoice")}</Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("recentInvoices")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>{t("date")}</TableHead>
                                <TableHead>{t("customer")}</TableHead>
                                <TableHead>{t("company")}</TableHead>
                                <TableHead className="text-right">{t("amount")}</TableHead>
                                <TableHead>{t("statusLabel")}</TableHead>
                                <TableHead className="text-right">{t("actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices && invoices.length > 0 ? (
                                invoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-medium">
                                            {invoice.invoiceNo}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(invoice.date).toLocaleDateString(
                                                locale === "ur" ? "ur-PK" : "en-PK"
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{invoice.customer.name}</div>
                                            <div className="text-xs text-muted-foreground font-noto-nastaliq">
                                                {invoice.customer.nameUrdu}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {invoice.company.name}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
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
                                        <TableCell className="text-right">
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
                                    <TableCell colSpan={7} className="h-24 text-center">
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
