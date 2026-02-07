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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
                    <p className="font-noto-nastaliq text-xl text-muted-foreground">
                        {customer.nameUrdu}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href={`/${locale}/customers/${id}/edit`}>
                        <Button variant="outline">{tActions("edit")}</Button>
                    </Link>
                    <Button variant="primary">{tActions("newInvoice")}</Button>
                    <Button variant="secondary">{tActions("recordPayment")}</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>{t("personalInfo")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">
                                {t("phone")}
                            </div>
                            <div>{customer.phone || "-"}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">
                                {t("email")}
                            </div>
                            <div>{customer.email || "-"}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">
                                {t("address")}
                            </div>
                            <div>{customer.address || "-"}</div>
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

                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>{t("financialInfo")}</CardTitle>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat(locale === "ur" ? "ur-PK" : "en-PK", {
                                style: "currency",
                                currency: "PKR",
                            }).format(Number(customer.balance))}
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                                {t("balance")}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent>
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
                                            <TableCell>
                                                {new Date(entry.date).toLocaleDateString(
                                                    locale === "ur" ? "ur-PK" : "en-PK"
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {entry.particulars}
                                                {entry.invoice?.invoiceNo && ` #${entry.invoice.invoiceNo}`}
                                                {entry.payment?.method && ` (${entry.payment.method})`}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {Number(entry.debit) > 0
                                                    ? new Intl.NumberFormat(
                                                        locale === "ur" ? "ur-PK" : "en-PK"
                                                    ).format(Number(entry.debit))
                                                    : "-"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {Number(entry.credit) > 0
                                                    ? new Intl.NumberFormat(
                                                        locale === "ur" ? "ur-PK" : "en-PK"
                                                    ).format(Number(entry.credit))
                                                    : "-"}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {new Intl.NumberFormat(
                                                    locale === "ur" ? "ur-PK" : "en-PK"
                                                ).format(Number(entry.balance))}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
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
