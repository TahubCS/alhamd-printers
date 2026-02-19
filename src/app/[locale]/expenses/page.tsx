import { getExpenses } from "@/actions/expense";
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
import DeleteExpenseButton from "@/components/expenses/DeleteExpenseButton";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ locale: string }>;
}

export default async function ExpensesPage({ params }: PageProps) {
    const { locale } = await params;
    const t = await getTranslations("expenses");
    const tActions = await getTranslations("actions");

    const { success, data: expenses, total, error } = await getExpenses();

    if (!success || !expenses) {
        console.error(error);
    }

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
                <Link href={`/${locale}/expenses/new`}>
                    <Button>{t("newExpense")}</Button>
                </Link>
            </div>

            <Card className="card" style={{ padding: isUrdu ? "28px" : "24px" }}>
                <CardHeader className="p-0 mb-6">
                    <CardTitle className="text-xl text-[var(--color-text-primary)]">
                        {t("recentExpenses")}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("date")}</TableHead>
                                <TableHead>{t("description")}</TableHead>
                                <TableHead className="text-right">{t("amount")}</TableHead>
                                <TableHead className="text-right w-[80px]">{t("actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenses && expenses.length > 0 ? (
                                <>
                                    {expenses.map((expense) => (
                                        <TableRow key={expense.id}>
                                            <TableCell className="text-[var(--color-text-secondary)]">
                                                {new Date(expense.date).toLocaleDateString(
                                                    isUrdu ? "ur-PK" : "en-PK"
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium text-[var(--color-text-primary)]">
                                                {expense.description}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-[var(--color-text-primary)]">
                                                {formatCurrency(expense.amount)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DeleteExpenseButton expenseId={expense.id} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {/* Total Row */}
                                    <TableRow className="border-t-2 border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                                        <TableCell className="font-bold text-[var(--color-text-primary)]" colSpan={2}>
                                            {t("total")}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-lg text-[var(--color-primary)]">
                                            {formatCurrency(total || 0)}
                                        </TableCell>
                                        <TableCell />
                                    </TableRow>
                                </>
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        className="h-24 text-center text-[var(--color-text-muted)]"
                                    >
                                        {t("noExpenses")}
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
