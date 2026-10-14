"use server";

import { prisma } from "@/lib/prisma";
import { daysBetween, lastMonthKeys, monthKey, startOfMonthKey, sumByMonth } from "@/lib/dashboard";

const TREND_MONTHS = 6;

/** Headline figures, the sales/expense trend and the lists that need attention today. */
export async function getDashboardData(now: Date = new Date()) {
    try {
        const months = lastMonthKeys(TREND_MONTHS, now);
        const trendStart = startOfMonthKey(months[0]);
        const thisMonth = monthKey(now);

        const [
            receivables,
            payables,
            pendingCheques,
            overdueInvoices,
            trendInvoices,
            trendExpenses,
            materials,
            customerCount,
        ] = await Promise.all([
            prisma.customer.aggregate({ where: { balance: { gt: 0 } }, _sum: { balance: true }, _count: true }),
            prisma.supplier.aggregate({ where: { balance: { gt: 0 } }, _sum: { balance: true }, _count: true }),
            prisma.cheque.aggregate({ where: { status: { in: ["RECEIVED", "DEPOSITED"] } }, _sum: { amount: true }, _count: true }),
            prisma.invoice.findMany({
                where: { status: { in: ["PENDING", "PARTIAL", "OVERDUE"] }, dueDate: { lt: now } },
                orderBy: { dueDate: "asc" },
                select: {
                    id: true,
                    invoiceNo: true,
                    dueDate: true,
                    total: true,
                    status: true,
                    customer: { select: { id: true, name: true } },
                },
            }),
            prisma.invoice.findMany({ where: { date: { gte: trendStart } }, select: { date: true, total: true } }),
            prisma.expense.findMany({ where: { date: { gte: trendStart } }, select: { date: true, amount: true } }),
            prisma.rawMaterial.findMany({ orderBy: { name: "asc" } }),
            prisma.customer.count(),
        ]);

        const sales = sumByMonth(months, trendInvoices.map((i) => ({ date: i.date, amount: Number(i.total) })));
        const expenses = sumByMonth(months, trendExpenses.map((e) => ({ date: e.date, amount: Number(e.amount) })));
        const current = months.indexOf(thisMonth);

        const lowStock = materials
            .map((m) => ({ id: m.id, name: m.name, quantity: Number(m.quantity), minimum: Number(m.minimumStockLevel) }))
            .filter((m) => m.quantity <= m.minimum);

        return {
            success: true,
            data: {
                kpis: {
                    receivables: Number(receivables._sum.balance ?? 0),
                    customersOwing: receivables._count,
                    customerCount,
                    payables: Number(payables._sum.balance ?? 0),
                    suppliersOwed: payables._count,
                    pendingCheques: Number(pendingCheques._sum.amount ?? 0),
                    pendingChequeCount: pendingCheques._count,
                    overdueCount: overdueInvoices.length,
                    salesThisMonth: sales[current] ?? 0,
                    expensesThisMonth: expenses[current] ?? 0,
                },
                trend: months.map((key, i) => ({ month: key, sales: sales[i], expenses: expenses[i] })),
                overdue: overdueInvoices.slice(0, 6).map((inv) => ({
                    id: inv.id,
                    invoiceNo: inv.invoiceNo,
                    customer: inv.customer,
                    total: Number(inv.total),
                    daysOverdue: daysBetween(inv.dueDate, now),
                })),
                lowStock,
            },
        };
    } catch (error) {
        console.error("Dashboard Error:", error);
        return { success: false, error: "Failed to load dashboard" };
    }
}
