import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { getAllPOs } from "@/actions/po";
import PageHeader from "@/components/layout/PageHeader";
import POStatusBadge from "@/components/po/POStatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Link } from "@/i18n/navigation";
import { formatDisplayDate, formatPKR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations("orders");
    const { data: purchaseOrders = [] } = await getAllPOs();

    return (
        <div className="animate-fade-in">
            <PageHeader
                title={t("title")}
                subtitle={t("subtitle")}
                actions={
                    <Link href="/purchase-orders/new">
                        <Button>
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            {t("newOrder")}
                        </Button>
                    </Link>
                }
            />

            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("date")}</TableHead>
                                <TableHead>{t("poNumber")}</TableHead>
                                <TableHead>{t("customer")}</TableHead>
                                <TableHead className="text-end">{t("amount")}</TableHead>
                                <TableHead className="text-center">{t("items")}</TableHead>
                                <TableHead>{t("status")}</TableHead>
                                <TableHead className="text-end">{t("actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchaseOrders.length > 0 ? (
                                purchaseOrders.map((po) => (
                                    <TableRow key={po.id}>
                                        <TableCell className="text-[var(--color-text-secondary)]">{formatDisplayDate(po.date, locale)}</TableCell>
                                        <TableCell className="font-medium text-[var(--color-text-primary)]" dir="ltr">{po.poNumber || "—"}</TableCell>
                                        <TableCell>
                                            <div className="font-medium text-[var(--color-text-primary)]">{po.customer?.name || "—"}</div>
                                            {po.customer?.nameUrdu && <div className="text-xs text-[var(--color-text-muted)]">{po.customer.nameUrdu}</div>}
                                        </TableCell>
                                        <TableCell className="text-end font-medium text-[var(--color-text-primary)]">{formatPKR(po.totalAmount, locale)}</TableCell>
                                        <TableCell className="text-center text-[var(--color-text-secondary)]">{po._count.items}</TableCell>
                                        <TableCell><POStatusBadge status={po.status} /></TableCell>
                                        <TableCell className="text-end">
                                            <Link href={`/purchase-orders/${po.id}`}>
                                                <Button size="sm" variant="secondary">{t("view")}</Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-[var(--color-text-muted)]">{t("empty")}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
