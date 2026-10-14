import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Pencil, ShoppingBag } from "lucide-react";
import { getSupplierById } from "@/actions/supplier";
import PageHeader from "@/components/layout/PageHeader";
import SupplierPaymentForm from "@/components/suppliers/SupplierPaymentForm";
import PurchaseStatusBadge from "@/components/suppliers/PurchaseStatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Link } from "@/i18n/navigation";
import { formatDisplayDate, formatPKR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SupplierDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = await params;
    const t = await getTranslations("suppliers");
    const tPayments = await getTranslations("payments");
    const tActions = await getTranslations("actions");
    const { data: supplier } = await getSupplierById(id);
    if (!supplier) notFound();

    const methodLabel = { CASH: tPayments("cash"), CHEQUE: tPayments("cheque"), BANK_TRANSFER: tPayments("bankTransfer") };

    return (
        <div className="animate-fade-in">
            <PageHeader
                title={supplier.name}
                subtitle={[supplier.nameUrdu, supplier.phone, supplier.address].filter(Boolean).join(" · ") || undefined}
                backLink={
                    <Link href="/suppliers" className="mb-3 inline-flex items-center gap-1 text-sm text-[var(--color-accent-primary)] hover:underline">
                        <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
                        {t("title")}
                    </Link>
                }
                actions={
                    <>
                        <Link href={`/suppliers/${supplier.id}/edit`}>
                            <Button variant="outline">
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                                {tActions("edit")}
                            </Button>
                        </Link>
                        <Link href={`/suppliers/purchases/new?supplierId=${supplier.id}`}>
                            <Button>
                                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                                {t("newPurchase")}
                            </Button>
                        </Link>
                    </>
                }
            />

            <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <div className="stat-card p-5">
                    <p className="text-sm text-[var(--color-text-secondary)]">{t("balance")}</p>
                    <p className={`mt-1 text-2xl font-semibold ${supplier.balance > 0 ? "text-[var(--color-warning)]" : "text-[var(--color-text-primary)]"}`}>{formatPKR(supplier.balance, locale)}</p>
                </div>
                <div className="stat-card p-5">
                    <p className="text-sm text-[var(--color-text-secondary)]">{t("totalPurchased")}</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">{formatPKR(supplier.totals.purchased, locale)}</p>
                </div>
                <div className="stat-card p-5">
                    <p className="text-sm text-[var(--color-text-secondary)]">{t("totalPaid")}</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">{formatPKR(supplier.totals.paid, locale)}</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card className="p-4 sm:p-6">
                        <CardHeader className="mb-4 p-0"><CardTitle>{t("purchaseOrders")}</CardTitle></CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>#</TableHead>
                                        <TableHead>{t("date")}</TableHead>
                                        <TableHead>{t("status")}</TableHead>
                                        <TableHead className="text-end">{t("orderTotal")}</TableHead>
                                        <TableHead className="text-end">{t("receivedValue")}</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {supplier.orders.length > 0 ? supplier.orders.map((po) => (
                                        <TableRow key={po.id}>
                                            <TableCell className="font-medium text-[var(--color-text-primary)]">{po.poNumber}</TableCell>
                                            <TableCell className="text-[var(--color-text-secondary)]">{formatDisplayDate(po.date, locale)}</TableCell>
                                            <TableCell><PurchaseStatusBadge status={po.status} /></TableCell>
                                            <TableCell className="text-end">{formatPKR(po.total, locale)}</TableCell>
                                            <TableCell className="text-end text-[var(--color-text-secondary)]">{formatPKR(po.receivedValue, locale)}</TableCell>
                                            <TableCell className="text-end">
                                                <Link href={`/suppliers/purchases/${po.id}`}>
                                                    <Button size="sm" variant="secondary">{tActions("view")}</Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={6} className="h-20 text-center text-[var(--color-text-muted)]">{t("noOrders")}</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card className="p-4 sm:p-6">
                        <CardHeader className="mb-4 p-0"><CardTitle>{t("payments")}</CardTitle></CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("date")}</TableHead>
                                        <TableHead>{tPayments("method")}</TableHead>
                                        <TableHead>{t("reference")}</TableHead>
                                        <TableHead className="text-end">{tPayments("amount")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {supplier.payments.length > 0 ? supplier.payments.map((payment) => (
                                        <TableRow key={payment.id}>
                                            <TableCell className="text-[var(--color-text-secondary)]">{formatDisplayDate(payment.date, locale)}</TableCell>
                                            <TableCell>{methodLabel[payment.method]}</TableCell>
                                            <TableCell className="text-[var(--color-text-secondary)]" dir="ltr">{payment.reference || "—"}</TableCell>
                                            <TableCell className="text-end font-medium text-[var(--color-success)]">{formatPKR(payment.amount, locale)}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={4} className="h-20 text-center text-[var(--color-text-muted)]">{t("noPayments")}</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <Card className="h-fit p-4 sm:p-6">
                    <CardHeader className="mb-4 p-0"><CardTitle>{t("recordPayment")}</CardTitle></CardHeader>
                    <CardContent className="p-0">
                        <SupplierPaymentForm supplierId={supplier.id} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
