import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, FileText, Truck } from "lucide-react";
import { getCustomerPOById } from "@/actions/po";
import PageHeader from "@/components/layout/PageHeader";
import POStatusBadge from "@/components/po/POStatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Link } from "@/i18n/navigation";
import { formatDisplayDate, formatPKR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderDetailsPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = await params;
    const t = await getTranslations("orders");
    const tDetail = await getTranslations("orders.detail");
    const { data: po } = await getCustomerPOById(id);
    if (!po) notFound();

    const number = new Intl.NumberFormat(locale === "ur" ? "ur-PK" : "en-PK");
    const canInvoice = po.status === "OPEN" || po.status === "PARTIAL";
    const hasUndelivered = po.items.some((item) => item.delivered < item.quantity);

    return (
        <div className="animate-fade-in p-3 rtl:p-4">
            <PageHeader
                title={`${t("poNumber")} ${po.poNumber ?? ""}`}
                subtitle={formatDisplayDate(po.date, locale, { dateStyle: "long" })}
                backLink={
                    <Link href="/purchase-orders" className="mb-3 inline-flex items-center gap-1 text-sm text-[var(--color-accent-primary)] hover:underline">
                        <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
                        {t("back")}
                    </Link>
                }
                actions={
                    <>
                        {hasUndelivered && po.customerId && (
                            <Link href={`/challans/new?fromPoId=${po.id}`}>
                                <Button variant="outline">
                                    <Truck className="h-4 w-4" aria-hidden="true" />
                                    {tDetail("challan")}
                                </Button>
                            </Link>
                        )}
                        {canInvoice && (
                            <Link href={`/invoices/new?fromPoId=${po.id}`}>
                                <Button>
                                    <FileText className="h-4 w-4" aria-hidden="true" />
                                    {tDetail("convert")}
                                </Button>
                            </Link>
                        )}
                    </>
                }
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card className="p-4 sm:p-6">
                        <CardHeader className="mb-4 flex-row items-center justify-between space-y-0 p-0">
                            <CardTitle className="text-lg text-[var(--color-text-primary)]">{t("items")}</CardTitle>
                            <POStatusBadge status={po.status} />
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{tDetail("description")}</TableHead>
                                        <TableHead className="text-end">{tDetail("qty")}</TableHead>
                                        <TableHead className="text-end">{tDetail("delivered")}</TableHead>
                                        <TableHead className="text-end">{tDetail("rate")}</TableHead>
                                        <TableHead className="text-end">{tDetail("gst")}</TableHead>
                                        <TableHead className="text-end">{t("amount")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {po.items.map((item) => {
                                        const attrs = Object.entries(item.customAttributes).filter(([, value]) => value);
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <div className="font-medium text-[var(--color-text-primary)]">{item.description}</div>
                                                    {attrs.length > 0 && (
                                                        <div className="text-xs text-[var(--color-text-muted)]">{attrs.map(([k, v]) => `${k}: ${v}`).join(" · ")}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-end">{number.format(item.quantity)} <span className="text-xs text-[var(--color-text-muted)]">{item.unit}</span></TableCell>
                                                <TableCell className={`text-end ${item.delivered >= item.quantity ? "text-green-300" : "text-[var(--color-text-secondary)]"}`}>
                                                    {number.format(item.delivered)}
                                                </TableCell>
                                                <TableCell className="text-end">{formatPKR(item.rate, locale, 2)}</TableCell>
                                                <TableCell className="text-end text-[var(--color-text-secondary)]">{item.gstRate > 0 ? `${item.gstRate}%` : "—"}</TableCell>
                                                <TableCell className="text-end font-medium">{formatPKR(item.amount, locale, 2)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                            <dl className="ms-auto mt-4 grid max-w-xs grid-cols-2 gap-y-1 text-sm">
                                <dt className="text-[var(--color-text-secondary)]">{tDetail("subtotal")}</dt>
                                <dd className="text-end">{formatPKR(po.subtotal || po.totalAmount, locale, 2)}</dd>
                                {po.taxTotal > 0 && (
                                    <>
                                        <dt className="text-[var(--color-text-secondary)]">{tDetail("gstTotal")}</dt>
                                        <dd className="text-end">{formatPKR(po.taxTotal, locale, 2)}</dd>
                                    </>
                                )}
                                <dt className="border-t border-[var(--color-border)] pt-2 text-base font-bold text-[var(--color-text-primary)]">{tDetail("total")}</dt>
                                <dd className="border-t border-[var(--color-border)] pt-2 text-end text-base font-bold text-[var(--color-text-primary)]">{formatPKR(po.totalAmount, locale, 2)}</dd>
                            </dl>
                        </CardContent>
                    </Card>

                    <Card className="p-4 sm:p-6">
                        <CardHeader className="mb-4 p-0">
                            <CardTitle className="text-lg text-[var(--color-text-primary)]">{tDetail("linkedInvoices")}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {po.invoices.length === 0 ? (
                                <p className="text-sm text-[var(--color-text-muted)]">{tDetail("noInvoices")}</p>
                            ) : (
                                <ul className="divide-y divide-[var(--color-border)]">
                                    {po.invoices.map((inv) => (
                                        <li key={inv.id}>
                                            <Link href={`/invoices/${inv.id}`} className="flex items-center justify-between gap-4 py-3 hover:bg-[var(--color-bg-hover)] sm:px-2">
                                                <span className="text-[var(--color-text-primary)]">
                                                    {tDetail("invoiceNo")} {inv.invoiceNo}
                                                    <span className="ms-2 text-sm text-[var(--color-text-muted)]">{formatDisplayDate(inv.date, locale)}</span>
                                                </span>
                                                <span className="font-medium">{formatPKR(inv.total, locale)}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card className="h-fit p-4 sm:p-6">
                    <CardHeader className="mb-4 p-0">
                        <CardTitle className="text-lg text-[var(--color-text-primary)]">{tDetail("customerDetails")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 p-0">
                        {po.customer ? (
                            <div>
                                <Link href={`/customers/${po.customer.id}`} className="text-lg font-bold text-[var(--color-accent-primary)] hover:underline">
                                    {po.customer.name}
                                </Link>
                                {po.customer.nameUrdu && <p className="text-[var(--color-text-secondary)]">{po.customer.nameUrdu}</p>}
                                {po.customer.phone && <p className="text-sm text-[var(--color-text-secondary)]" dir="ltr">{po.customer.phone}</p>}
                            </div>
                        ) : (
                            <p className="text-[var(--color-text-muted)]">—</p>
                        )}
                        <div>
                            <p className="text-sm font-medium text-[var(--color-text-secondary)]">{tDetail("notes")}</p>
                            <p className="mt-1 whitespace-pre-line text-sm text-[var(--color-text-primary)]">{po.notes || tDetail("noNotes")}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
