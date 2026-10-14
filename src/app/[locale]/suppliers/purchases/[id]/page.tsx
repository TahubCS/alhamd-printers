import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { getPurchaseOrderById } from "@/actions/supplier";
import PrintButton from "@/components/invoices/PrintButton";
import CancelPurchaseButton from "@/components/suppliers/CancelPurchaseButton";
import PurchaseStatusBadge from "@/components/suppliers/PurchaseStatusBadge";
import ReceiveGoodsForm from "@/components/suppliers/ReceiveGoodsForm";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Link } from "@/i18n/navigation";
import { formatDisplayDate, formatPKR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PurchaseDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = await params;
    const t = await getTranslations("suppliers");
    const { data: po } = await getPurchaseOrderById(id);
    if (!po) notFound();

    const number = new Intl.NumberFormat(locale === "ur" ? "ur-PK" : "en-PK");
    const canReceive = po.status === "PENDING" || po.status === "PARTIAL";
    const canCancel = po.status === "PENDING" && po.items.every((item) => item.receivedQuantity === 0);

    return (
        <div className="animate-fade-in">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3 print:hidden">
                <Link href={`/suppliers/${po.supplier.id}`}>
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
                        {po.supplier.name}
                    </Button>
                </Link>
                <div className="flex gap-2">
                    {canCancel && <CancelPurchaseButton purchaseOrderId={po.id} />}
                    <PrintButton label={t("printPurchase")} />
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <article className="card p-6 sm:p-8 lg:col-span-2 print:col-span-3">
                    <header className="mb-6 flex flex-col gap-4 border-b border-[var(--color-border)] pb-6 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{t("supplier")}</p>
                            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">{po.supplier.name}</h1>
                            {po.supplier.address && <p className="text-sm text-[var(--color-text-secondary)]">{po.supplier.address}</p>}
                            {po.supplier.phone && <p className="text-sm text-[var(--color-text-secondary)]" dir="ltr">{po.supplier.phone}</p>}
                        </div>
                        <div className="sm:text-end">
                            <p className="text-xl font-semibold uppercase tracking-wide text-[var(--color-text-primary)]">{t("purchaseOrder")}</p>
                            <p className="text-[var(--color-text-secondary)]"># {po.poNumber}</p>
                            <p className="text-sm text-[var(--color-text-secondary)]">{formatDisplayDate(po.date, locale)}</p>
                            <div className="mt-2 print:hidden"><PurchaseStatusBadge status={po.status} /></div>
                        </div>
                    </header>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("description")}</TableHead>
                                <TableHead className="text-end">{t("quantity")}</TableHead>
                                <TableHead className="text-end print:hidden">{t("received")}</TableHead>
                                <TableHead className="text-end">{t("rate")}</TableHead>
                                <TableHead className="text-end">{t("amount")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {po.items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div className="text-[var(--color-text-primary)]">{item.description}</div>
                                        {(item.specification || item.material) && (
                                            <div className="text-xs text-[var(--color-text-muted)]">
                                                {[item.specification, item.material && `${t("stockItem")}: ${item.material.name}`].filter(Boolean).join(" · ")}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-end">{number.format(item.quantity)}</TableCell>
                                    <TableCell className={`text-end print:hidden ${item.remaining === 0 ? "text-[var(--color-success)]" : "text-[var(--color-text-secondary)]"}`}>
                                        {number.format(item.receivedQuantity)}
                                    </TableCell>
                                    <TableCell className="text-end">{formatPKR(item.rate, locale, 2)}</TableCell>
                                    <TableCell className="text-end font-medium">{formatPKR(item.amount, locale, 2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="mt-4 flex justify-end text-lg font-semibold text-[var(--color-text-primary)]">
                        {t("orderTotal")}: <span className="ms-2">{formatPKR(po.total, locale, 2)}</span>
                    </div>
                    {po.notes && <p className="mt-4 text-sm text-[var(--color-text-secondary)]">{po.notes}</p>}
                </article>

                {canReceive && (
                    <Card className="h-fit p-4 sm:p-6 print:hidden">
                        <CardHeader className="mb-4 p-0"><CardTitle>{t("receiveGoods")}</CardTitle></CardHeader>
                        <CardContent className="p-0">
                            <ReceiveGoodsForm
                                // Remount after each receipt so the inputs show the new outstanding quantities
                                key={po.items.map((item) => item.receivedQuantity).join("-")}
                                purchaseOrderId={po.id}
                                lines={po.items.map((item) => ({ id: item.id, description: item.description, remaining: item.remaining, stocked: Boolean(item.material) }))}
                            />
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
