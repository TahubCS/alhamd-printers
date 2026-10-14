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
import ExpenseFilter from "@/components/expenses/ExpenseFilter";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function ExpensesPage({ params, searchParams }: PageProps) {
    const { locale } = await params;
    const { month, year } = await searchParams;
    const t = await getTranslations("expenses");

    const filters: { month?: number; year?: number } = {};
    if (month) filters.month = parseInt(month);
    if (year) filters.year = parseInt(year);

    const { success, data: expenses, total, error } = await getExpenses(filters);

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

    // Group expenses by month
    interface ExpenseEntry {
        id: string;
        date: Date;
        description: string;
        amount: number;
        receiptUrl: string | null;
        createdAt: Date;
    }

    const groupedExpenses: Record<string, { expenses: ExpenseEntry[]; total: number; label: string }> = {};

    if (expenses) {
        for (const expense of expenses) {
            const d = new Date(expense.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const label = d.toLocaleDateString(isUrdu ? "ur-PK" : "en-PK", {
                month: "long",
                year: "numeric",
            });

            if (!groupedExpenses[key]) {
                groupedExpenses[key] = { expenses: [], total: 0, label };
            }
            groupedExpenses[key].expenses.push(expense);
            groupedExpenses[key].total += expense.amount;
        }
    }

    // Sort groups by date (newest first)
    const sortedGroups = Object.entries(groupedExpenses).sort(
        ([a], [b]) => b.localeCompare(a)
    );

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
                <Link href={`/${locale}/expenses/new`}>
                    <Button>{t("newExpense")}</Button>
                </Link>
            </div>

            {/* Month/Year Filter */}
            <Card className="mb-6 p-4">
                <ExpenseFilter />
            </Card>

            {/* Grouped Expenses */}
            {sortedGroups.length > 0 ? (
                sortedGroups.map(([key, group]) => (
                    <Card key={key} className="mb-4 p-5">
                        <CardHeader className="p-0 mb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-[var(--color-text-primary)]">
                                    {group.label}
                                </CardTitle>
                                <span className="text-sm font-semibold text-[var(--color-primary)]">
                                    {formatCurrency(group.total)}
                                </span>
                            </div>
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
                                    {group.expenses.map((expense) => (
                                        <TableRow key={expense.id}>
                                            <TableCell className="text-[var(--color-text-secondary)]">
                                                {new Date(expense.date).toLocaleDateString(
                                                    isUrdu ? "ur-PK" : "en-PK",
                                                    { day: "numeric", month: "short" }
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
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ))
            ) : (
                <Card className="p-5">
                    <div className="text-center py-12 text-[var(--color-text-muted)]">
                        {t("noExpenses")}
                    </div>
                </Card>
            )}

            {/* Grand Total */}
            {sortedGroups.length > 0 && (
                <Card className="px-5 py-4">
                    <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-[var(--color-text-primary)]">
                            {t("grandTotal")}
                        </span>
                        <span className="text-xl font-semibold text-[var(--color-primary)]">
                            {formatCurrency(total || 0)}
                        </span>
                    </div>
                </Card>
            )}
        </div>
    );
}
