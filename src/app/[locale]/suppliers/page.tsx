import { getTranslations } from "next-intl/server";
import { Plus, ShoppingBag } from "lucide-react";
import { getSuppliers } from "@/actions/supplier";
import PageHeader from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Link } from "@/i18n/navigation";
import { formatPKR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations("suppliers");
    const tActions = await getTranslations("actions");
    const { data: suppliers = [] } = await getSuppliers();
    const totalPayable = suppliers.reduce((sum, s) => sum + Math.max(0, s.balance), 0);

    return (
        <div className="animate-fade-in">
            <PageHeader
                title={t("title")}
                subtitle={t("subtitle")}
                actions={
                    <>
                        <Link href="/suppliers/purchases/new">
                            <Button variant="secondary">
                                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                                {t("newPurchase")}
                            </Button>
                        </Link>
                        <Link href="/suppliers/new">
                            <Button>
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                {t("newSupplier")}
                            </Button>
                        </Link>
                    </>
                }
            />

            <div className="stat-card mb-6 max-w-sm p-5">
                <p className="text-sm text-[var(--color-text-secondary)]">{t("totalPayable")}</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">{formatPKR(totalPayable, locale)}</p>
            </div>

            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("name")}</TableHead>
                                <TableHead>{t("phone")}</TableHead>
                                <TableHead>{t("openOrders")}</TableHead>
                                <TableHead className="text-end">{t("balance")}</TableHead>
                                <TableHead className="text-end">{t("actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {suppliers.length > 0 ? (
                                suppliers.map((supplier) => (
                                    <TableRow key={supplier.id}>
                                        <TableCell>
                                            <div className="font-medium text-[var(--color-text-primary)]">{supplier.name}</div>
                                            {supplier.nameUrdu && <div className="text-xs text-[var(--color-text-muted)]">{supplier.nameUrdu}</div>}
                                        </TableCell>
                                        <TableCell className="text-[var(--color-text-secondary)]" dir="ltr">{supplier.phone || "—"}</TableCell>
                                        <TableCell>
                                            {supplier.openOrders > 0 ? <Badge variant="warning">{supplier.openOrders}</Badge> : <span className="text-[var(--color-text-muted)]">—</span>}
                                        </TableCell>
                                        <TableCell className={`text-end font-semibold ${supplier.balance > 0 ? "text-[var(--color-warning)]" : "text-[var(--color-text-secondary)]"}`}>
                                            {formatPKR(supplier.balance, locale)}
                                        </TableCell>
                                        <TableCell className="text-end">
                                            <Link href={`/suppliers/${supplier.id}`}>
                                                <Button size="sm" variant="secondary">{tActions("view")}</Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-[var(--color-text-muted)]">{t("empty")}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
