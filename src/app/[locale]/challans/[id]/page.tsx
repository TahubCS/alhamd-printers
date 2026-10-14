import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { getChallanById } from "@/actions/challan";
import DeleteChallanButton from "@/components/challans/DeleteChallanButton";
import PrintButton from "@/components/invoices/PrintButton";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Link } from "@/i18n/navigation";
import { formatDisplayDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ChallanDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = await params;
    const t = await getTranslations("challans");
    const { data: challan } = await getChallanById(id);
    if (!challan) notFound();

    const number = new Intl.NumberFormat(locale === "ur" ? "ur-PK" : "en-PK");
    const totalQuantity = challan.items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="animate-fade-in">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3 print:hidden">
                <Link href="/challans">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
                        {t("title")}
                    </Button>
                </Link>
                <div className="flex gap-2">
                    <PrintButton label={t("print")} />
                    <DeleteChallanButton challanId={challan.id} challanNo={challan.challanNo} />
                </div>
            </div>

            <article className="card p-6 sm:p-8">
                <header className="mb-8 flex flex-col gap-6 border-b border-[var(--color-border)] pb-6 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">{challan.company?.name ?? t("title")}</h1>
                        {challan.company?.address && <p className="text-sm text-[var(--color-text-secondary)]">{challan.company.address}</p>}
                        {challan.company?.phone && <p className="text-sm text-[var(--color-text-secondary)]" dir="ltr">{challan.company.phone}</p>}
                    </div>
                    <div className="sm:text-end">
                        <p className="text-xl font-semibold uppercase tracking-wide text-[var(--color-text-primary)]">{t("documentTitle")}</p>
                        <p className="text-[var(--color-text-secondary)]"># {challan.challanNo}</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">{formatDisplayDate(challan.date, locale)}</p>
                    </div>
                </header>

                <section className="mb-8 grid gap-6 sm:grid-cols-2">
                    <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{t("deliverTo")}</p>
                        <p className="font-semibold text-[var(--color-text-primary)]">{challan.customer.name}</p>
                        {challan.customer.nameUrdu && <p className="text-[var(--color-text-secondary)]">{challan.customer.nameUrdu}</p>}
                        {challan.customer.address && <p className="text-sm text-[var(--color-text-secondary)]">{challan.customer.address}</p>}
                        {challan.customer.phone && <p className="text-sm text-[var(--color-text-secondary)]" dir="ltr">{challan.customer.phone}</p>}
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:justify-self-end">
                        <dt className="text-[var(--color-text-muted)]">{t("poNumber")}</dt>
                        <dd className="text-[var(--color-text-primary)]">{challan.poNumber || "—"}</dd>
                        <dt className="text-[var(--color-text-muted)]">{t("vehicle")}</dt>
                        <dd className="text-[var(--color-text-primary)]" dir="ltr">{challan.vehicleNo || "—"}</dd>
                        <dt className="text-[var(--color-text-muted)]">{t("driver")}</dt>
                        <dd className="text-[var(--color-text-primary)]">{challan.driverName || "—"}</dd>
                    </dl>
                </section>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>{t("description")}</TableHead>
                            <TableHead className="text-end">{t("quantity")}</TableHead>
                            <TableHead>{t("unit")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {challan.items.map((item, index) => (
                            <TableRow key={item.id}>
                                <TableCell className="text-[var(--color-text-muted)]">{index + 1}</TableCell>
                                <TableCell className="text-[var(--color-text-primary)]">{item.description}</TableCell>
                                <TableCell className="text-end font-medium text-[var(--color-text-primary)]">{number.format(item.quantity)}</TableCell>
                                <TableCell className="text-[var(--color-text-secondary)]">{item.unit}</TableCell>
                            </TableRow>
                        ))}
                        <TableRow>
                            <TableCell />
                            <TableCell className="font-semibold text-[var(--color-text-primary)]">{t("totalQuantity")}</TableCell>
                            <TableCell className="text-end font-semibold text-[var(--color-text-primary)]">{number.format(totalQuantity)}</TableCell>
                            <TableCell />
                        </TableRow>
                    </TableBody>
                </Table>

                {challan.notes && <p className="mt-6 text-sm text-[var(--color-text-secondary)]">{challan.notes}</p>}

                <footer className="mt-16 grid grid-cols-2 gap-12 text-center text-sm text-[var(--color-text-secondary)]">
                    <div className="border-t border-[var(--color-border)] pt-2">{t("dispatchedBy")}</div>
                    <div className="border-t border-[var(--color-border)] pt-2">{t("receivedBy")}</div>
                </footer>
            </article>
        </div>
    );
}
