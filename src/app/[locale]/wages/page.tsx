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

    const { success, data: workers } = await getWorkers();
    const isUrdu = locale === "ur";

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat(isUrdu ? "ur-PK" : "en-PK", {
            style: "currency",
            currency: "PKR",
            minimumFractionDigits: 0,
        }).format(amount);

    return (
        <div className="animate-fade-in" style={{ padding: isUrdu ? "16px" : "12px" }}>
            <div
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                style={{ marginBottom: isUrdu ? "48px" : "40px" }}
            >
                <div>
                    <h1
                        className="font-bold text-[var(--color-text-primary)]"
                        style={{
                            fontSize: isUrdu ? "2.5rem" : "2rem",
                            marginBottom: isUrdu ? "16px" : "12px",
                            lineHeight: isUrdu ? "1.4" : "1.2",
                        }}
                    >
                        {t("title")}
                    </h1>
                    <p
                        className="text-[var(--color-text-secondary)]"
                        style={{
                            fontSize: isUrdu ? "1.2rem" : "1.1rem",
                            lineHeight: isUrdu ? "1.8" : "1.5",
                        }}
                    >
                        {t("subtitle")}
                    </p>
                </div>
                <Link href={`/${locale}/wages/new`}>
                    <Button>{t("addWorker")}</Button>
                </Link>
            </div>

            <Card className="card" style={{ padding: isUrdu ? "28px" : "24px" }}>
                <CardHeader className="p-0 mb-6">
                    <CardTitle className="text-xl text-[var(--color-text-primary)]">
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
                                        <TableCell className={`text-right font-bold ${worker.balance < 0 ? "text-red-500" : worker.balance > 0 ? "text-green-500" : "text-[var(--color-text-secondary)]"}`}>
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
