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
    const tActions = await getTranslations("actions");

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

    // Generate month options for filter
    const currentYear = new Date().getFullYear();
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ];

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

            {/* Month/Year Filter */}
            <Card className="card mb-6" style={{ padding: "16px" }}>
                <ExpenseFilter />
            </Card>

            {/* Grouped Expenses */}
            {sortedGroups.length > 0 ? (
                sortedGroups.map(([key, group]) => (
                    <Card key={key} className="card mb-4" style={{ padding: isUrdu ? "28px" : "24px" }}>
                        <CardHeader className="p-0 mb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg text-[var(--color-text-primary)]">
                                    {group.label}
                                </CardTitle>
                                <span className="text-sm font-bold text-[var(--color-primary)]">
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
                <Card className="card" style={{ padding: "24px" }}>
                    <div className="text-center py-12 text-[var(--color-text-muted)]">
                        {t("noExpenses")}
                    </div>
                </Card>
            )}

            {/* Grand Total */}
            {sortedGroups.length > 0 && (
                <Card className="card" style={{ padding: "16px 24px" }}>
                    <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-[var(--color-text-primary)]">
                            {t("grandTotal")}
                        </span>
                        <span className="text-xl font-bold text-[var(--color-primary)]">
                            {formatCurrency(total || 0)}
                        </span>
                    </div>
                </Card>
            )}
        </div>
    );
}
