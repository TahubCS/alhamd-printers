import { getWorkerById } from "@/actions/wage";
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
import DeleteWageEntryButton from "@/components/wages/DeleteWageEntryButton";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ locale: string; id: string }>;
}

export default async function WorkerDetailPage({ params }: PageProps) {
    const { locale, id } = await params;
    const t = await getTranslations("wages");
    const tEntry = await getTranslations("wages.entry");

    const { success, data: worker } = await getWorkerById(id);

    if (!success || !worker) {
        notFound();
    }

    const isUrdu = locale === "ur";

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat(isUrdu ? "ur-PK" : "en-PK", {
            style: "currency",
            currency: "PKR",
            minimumFractionDigits: 0,
        }).format(amount);

    // Group entries by month
    interface LedgerEntry {
        id: string;
        date: Date;
        type: string;
        amount: number;
        notes: string | null;
        createdAt: Date;
    }

    const grouped: Record<string, { entries: LedgerEntry[]; totalCredit: number; totalDebit: number; label: string }> = {};

    for (const entry of worker.wagePayments) {
        const d = new Date(entry.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString(isUrdu ? "ur-PK" : "en-PK", {
            month: "long",
            year: "numeric",
        });

        if (!grouped[key]) {
            grouped[key] = { entries: [], totalCredit: 0, totalDebit: 0, label };
        }
        grouped[key].entries.push(entry);

        if (entry.type === "ADVANCE") {
            grouped[key].totalDebit += entry.amount;
        } else {
            grouped[key].totalCredit += entry.amount;
        }
    }

    const sortedGroups = Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));

    const typeLabel = (type: string) => {
        switch (type) {
            case "PAYMENT": return tEntry("wagePayment");
            case "ADVANCE": return tEntry("advance");
            case "DEDUCTION": return tEntry("deduction");
            case "ADJUSTMENT": return tEntry("adjustment");
            default: return type;
        }
    };

    const typeColor = (type: string) => {
        switch (type) {
            case "PAYMENT": return "text-green-500";
            case "DEDUCTION": return "text-green-500";
            case "ADVANCE": return "text-red-500";
            default: return "text-[var(--color-text-primary)]";
        }
    };

    return (
        <div className="animate-fade-in" style={{ padding: isUrdu ? "16px" : "12px" }}>
            {/* Header */}
            <div
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                style={{ marginBottom: "32px" }}
            >
                <div>
                    <Link href={`/${locale}/wages`} className="text-sm text-[var(--color-primary)] hover:underline mb-2 inline-block">
                        ← {t("title")}
                    </Link>
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                        {worker.name}
                    </h1>
                    {worker.phone && (
                        <p className="text-sm text-[var(--color-text-secondary)]">{worker.phone}</p>
                    )}
                </div>
                <Link href={`/${locale}/wages/${id}/pay`}>
                    <Button>{t("recordEntry")}</Button>
                </Link>
            </div>

            {/* Balance Card */}
            <Card className="card mb-6" style={{ padding: "20px 24px" }}>
                <div className="flex items-center justify-between">
                    <span className="text-lg font-medium text-[var(--color-text-secondary)]">
                        {t("currentBalance")}
                    </span>
                    <div className="text-right">
                        <span className={`text-2xl font-bold ${worker.balance < 0 ? "text-red-500" : worker.balance > 0 ? "text-green-500" : "text-[var(--color-text-primary)]"}`}>
                            {formatCurrency(Math.abs(worker.balance))}
                        </span>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                            {worker.balance < 0 ? t("workerOwes") : worker.balance > 0 ? t("companyOwes") : t("settled")}
                        </p>
                    </div>
                </div>
            </Card>

            {/* T-Account Ledger grouped by month */}
            {sortedGroups.length > 0 ? (
                sortedGroups.map(([key, group]) => (
                    <Card key={key} className="card mb-4" style={{ padding: isUrdu ? "28px" : "24px" }}>
                        <CardHeader className="p-0 mb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg text-[var(--color-text-primary)]">
                                    {group.label}
                                </CardTitle>
                                <div className="flex gap-4 text-sm">
                                    <span className="text-green-500 font-semibold">
                                        +{formatCurrency(group.totalCredit)}
                                    </span>
                                    <span className="text-red-500 font-semibold">
                                        -{formatCurrency(group.totalDebit)}
                                    </span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("date")}</TableHead>
                                        <TableHead>{tEntry("type")}</TableHead>
                                        <TableHead>{tEntry("notes")}</TableHead>
                                        <TableHead className="text-right">{t("credit")}</TableHead>
                                        <TableHead className="text-right">{t("debit")}</TableHead>
                                        <TableHead className="text-right w-[60px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {group.entries.map((entry) => {
                                        const isDebit = entry.type === "ADVANCE";
                                        return (
                                            <TableRow key={entry.id}>
                                                <TableCell className="text-[var(--color-text-secondary)]">
                                                    {new Date(entry.date).toLocaleDateString(
                                                        isUrdu ? "ur-PK" : "en-PK",
                                                        { day: "numeric", month: "short" }
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`font-medium ${typeColor(entry.type)}`}>
                                                        {typeLabel(entry.type)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-[var(--color-text-secondary)]">
                                                    {entry.notes || "—"}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-green-500">
                                                    {!isDebit ? formatCurrency(entry.amount) : ""}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-red-500">
                                                    {isDebit ? formatCurrency(entry.amount) : ""}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DeleteWageEntryButton entryId={entry.id} />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ))
            ) : (
                <Card className="card" style={{ padding: "24px" }}>
                    <div className="text-center py-12 text-[var(--color-text-muted)]">
                        {t("noEntries")}
                    </div>
                </Card>
            )}
        </div>
    );
}
