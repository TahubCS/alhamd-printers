import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { getChallans } from "@/actions/challan";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Link } from "@/i18n/navigation";
import { formatDisplayDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ChallansPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations("challans");
    const tActions = await getTranslations("actions");
    const { data: challans = [] } = await getChallans();
    const number = new Intl.NumberFormat(locale === "ur" ? "ur-PK" : "en-PK");

    return (
        <div className="animate-fade-in">
            <PageHeader
                title={t("title")}
                subtitle={t("subtitle")}
                actions={
                    <Link href="/challans/new">
                        <Button>
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            {t("newChallan")}
                        </Button>
                    </Link>
                }
            />
            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>{t("date")}</TableHead>
                                <TableHead>{t("customer")}</TableHead>
                                <TableHead>{t("poNumber")}</TableHead>
                                <TableHead>{t("vehicle")}</TableHead>
                                <TableHead className="text-end">{t("totalQuantity")}</TableHead>
                                <TableHead className="text-end">{t("actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {challans.length > 0 ? (
                                challans.map((challan) => (
                                    <TableRow key={challan.id}>
                                        <TableCell className="font-medium text-[var(--color-text-primary)]">{challan.challanNo}</TableCell>
                                        <TableCell className="text-[var(--color-text-secondary)]">{formatDisplayDate(challan.date, locale)}</TableCell>
                                        <TableCell>
                                            <div className="font-medium text-[var(--color-text-primary)]">{challan.customer.name}</div>
                                            {challan.customer.nameUrdu && <div className="text-xs text-[var(--color-text-muted)]">{challan.customer.nameUrdu}</div>}
                                        </TableCell>
                                        <TableCell className="text-[var(--color-text-secondary)]">{challan.poNumber || "—"}</TableCell>
                                        <TableCell className="text-[var(--color-text-secondary)]" dir="ltr">{challan.vehicleNo || "—"}</TableCell>
                                        <TableCell className="text-end text-[var(--color-text-primary)]">
                                            {number.format(challan.totalQuantity)}
                                            <span className="ms-1 text-xs text-[var(--color-text-muted)]">({t("lines", { count: challan.lineCount })})</span>
                                        </TableCell>
                                        <TableCell className="text-end">
                                            <Link href={`/challans/${challan.id}`}>
                                                <Button size="sm" variant="secondary">{tActions("view")}</Button>
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
