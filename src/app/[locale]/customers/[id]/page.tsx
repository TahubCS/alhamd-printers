import { getCustomerById, getCustomerLedger } from "@/actions/customer";
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
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CustomerDetailsPage({
    params,
}: {
    params: Promise<{ locale: string; id: string }>;
}) {
    const { locale, id } = await params;
    const t = await getTranslations("customers");
    const tActions = await getTranslations("actions");

    const [customerResult, ledgerResult] = await Promise.all([
        getCustomerById(id),
        getCustomerLedger(id),
    ]);

    if (!customerResult.success || !customerResult.data) {
        notFound();
    }

    const customer = customerResult.data;
    const ledger = ledgerResult.data || [];

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
                        {customer.name}
                    </h1>
                    <p
                        className="text-[var(--color-text-secondary)]"
                        style={{
                            fontSize: isUrdu ? '1.2rem' : '1.1rem',
                            lineHeight: isUrdu ? '1.8' : '1.5'
                        }}
                    >
                        {customer.nameUrdu}
                    </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Link href={`/${locale}/customers/${id}/edit`}>
                        <Button variant="outline" className="w-full sm:w-auto">{tActions("edit")}</Button>
                    </Link>
                    <Link href={`/${locale}/invoices/new?customerId=${id}`}>
                        <Button variant="primary" className="w-full sm:w-auto">{tActions("newInvoice")}</Button>
                    </Link>
                    <Button variant="secondary" className="w-full sm:w-auto">{tActions("recordPayment")}</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: isUrdu ? '24px' : '20px' }}>
                <Card className="card md:col-span-1" style={{ padding: isUrdu ? '28px' : '24px' }}>
                    <CardHeader className="p-0 mb-6">
                        <CardTitle className="text-xl text-[var(--color-text-primary)]">{t("personalInfo")}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 space-y-4">
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">
                                {t("phone")}
                            </div>
                            <div className="text-[var(--color-text-primary)]">{customer.phone || "-"}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">
                                {t("email")}
                            </div>
                            <div className="text-[var(--color-text-primary)]">{customer.email || "-"}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">
                                {t("address")}
                            </div>
                            <div className="text-[var(--color-text-primary)]">{customer.address || "-"}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">
                                {t("status")}
                            </div>
                            <div className="mt-1">
                                {customer.isBadDebt ? (
                                    <Badge variant="danger">{t("badDebt")}</Badge>
                                ) : (
                                    <Badge variant="success">{t("good")}</Badge>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="card md:col-span-2" style={{ padding: isUrdu ? '28px' : '24px' }}>
                    <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
                        <CardTitle className="text-xl text-[var(--color-text-primary)]">{t("financialInfo")}</CardTitle>
                        <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                            {new Intl.NumberFormat(locale === "ur" ? "ur-PK" : "en-PK", {
                                style: "currency",
                                currency: "PKR",
                            }).format(Number(customer.balance))}
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                                {t("balance")}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Particulars</TableHead>
                                    <TableHead className="text-right">Debit</TableHead>
                                    <TableHead className="text-right">Credit</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ledger.length > 0 ? (
                                    ledger.map((entry: any) => (
                                        <TableRow key={entry.id}>
                                            <TableCell className="text-[var(--color-text-secondary)]">
                                                {new Date(entry.date).toLocaleDateString(
                                                    locale === "ur" ? "ur-PK" : "en-PK"
                                                )}
                                            </TableCell>
                                            <TableCell className="text-[var(--color-text-primary)]">
                                                {entry.particulars}
                                                {entry.invoice?.invoiceNo && ` #${entry.invoice.invoiceNo}`}
                                                {entry.payment?.method && ` (${entry.payment.method})`}
                                            </TableCell>
                                            <TableCell className="text-right text-[var(--color-text-primary)]">
                                                {Number(entry.debit) > 0
                                                    ? new Intl.NumberFormat(
                                                        locale === "ur" ? "ur-PK" : "en-PK"
                                                    ).format(Number(entry.debit))
                                                    : "-"}
                                            </TableCell>
                                            <TableCell className="text-right text-[var(--color-text-primary)]">
                                                {Number(entry.credit) > 0
                                                    ? new Intl.NumberFormat(
                                                        locale === "ur" ? "ur-PK" : "en-PK"
                                                    ).format(Number(entry.credit))
                                                    : "-"}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-[var(--color-text-primary)]">
                                                {new Intl.NumberFormat(
                                                    locale === "ur" ? "ur-PK" : "en-PK"
                                                ).format(Number(entry.balance))}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No transactions found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
