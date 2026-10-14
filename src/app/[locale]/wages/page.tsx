import { getWorkers } from "@/actions/wage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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
}

export default async function WagesPage({ params }: PageProps) {
    const { locale } = await params;
    const t = await getTranslations("wages");

    const { data: workers } = await getWorkers();
    const isUrdu = locale === "ur";

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat(isUrdu ? "ur-PK" : "en-PK", {
            style: "currency",
            currency: "PKR",
            minimumFractionDigits: 0,
        }).format(amount);

    return (
        <div className="animate-fade-in">
            <div
                className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
            >
                <div>
                    <h1 className="text-2xl font-semibold leading-8 tracking-tight text-[var(--color-text-primary)] rtl:leading-10">
                        {t("title")}
                    </h1>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        {t("subtitle")}
                    </p>
                </div>
                <Link href={`/${locale}/wages/new`}>
                    <Button>{t("addWorker")}</Button>
                </Link>
            </div>

            <Card className="overflow-hidden">
                <CardHeader className="border-b border-[var(--color-border)] px-5 py-3.5">
                    <CardTitle className="text-[var(--color-text-primary)]">
                        {t("workerList")}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("name")}</TableHead>
                                <TableHead>{t("phone")}</TableHead>
                                <TableHead className="text-right">{t("balance")}</TableHead>
                                <TableHead>{t("lastActivity")}</TableHead>
                                <TableHead className="text-right w-[120px]">{t("actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {workers && workers.length > 0 ? (
                                workers.map((worker) => (
                                    <TableRow key={worker.id}>
                                        <TableCell className="font-medium text-[var(--color-text-primary)]">
                                            {worker.name}
                                        </TableCell>
                                        <TableCell className="text-[var(--color-text-secondary)]">
                                            {worker.phone || "—"}
                                        </TableCell>
                                        <TableCell className={`text-right font-semibold ${worker.balance < 0 ? "text-[var(--color-error)]" : worker.balance > 0 ? "text-[var(--color-success)]" : "text-[var(--color-text-secondary)]"}`}>
                                            {formatCurrency(Math.abs(worker.balance))}
                                            {worker.balance < 0 && (
                                                <span className="text-xs ml-1">({t("owes")})</span>
                                            )}
                                            {worker.balance > 0 && (
                                                <span className="text-xs ml-1">({t("owed")})</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-[var(--color-text-secondary)] text-sm">
                                            {worker.lastEntryDate
                                                ? new Date(worker.lastEntryDate).toLocaleDateString(isUrdu ? "ur-PK" : "en-PK")
                                                : "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Link href={`/${locale}/wages/${worker.id}`}>
                                                    <Button size="sm" variant="secondary">{t("viewLedger")}</Button>
                                                </Link>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-[var(--color-text-muted)]">
                                        {t("noWorkers")}
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
