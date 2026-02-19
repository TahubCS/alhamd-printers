"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { extractDataFromReceipt } from "@/lib/ai/receipt-extractor";

// ============================================
// CREATE EXPENSE
// ============================================
export async function createExpense(data: {
    date: Date;
    description: string;
    amount: number;
    receiptUrl?: string;
}) {
    try {
        const expense = await prisma.expense.create({
            data: {
                date: data.date,
                description: data.description,
                amount: data.amount,
                receiptUrl: data.receiptUrl || null,
            },
        });

        revalidatePath("/expenses");
        return {
            success: true,
            data: {
                id: expense.id,
                date: expense.date,
                description: expense.description,
                amount: Number(expense.amount),
            },
        };
    } catch (error) {
        console.error("Create Expense Error:", error);
        return { success: false, error: "Failed to create expense" };
    }
}

// ============================================
// GET EXPENSES (List)
// ============================================
export async function getExpenses(filters?: {
    month?: number; // 1-12
    year?: number;
}) {
    try {
        const where: any = {};

        if (filters?.month && filters?.year) {
            const startDate = new Date(filters.year, filters.month - 1, 1);
            const endDate = new Date(filters.year, filters.month, 0, 23, 59, 59);
            where.date = { gte: startDate, lte: endDate };
        } else if (filters?.year) {
            const startDate = new Date(filters.year, 0, 1);
            const endDate = new Date(filters.year, 11, 31, 23, 59, 59);
            where.date = { gte: startDate, lte: endDate };
        }

        const expenses = await prisma.expense.findMany({
            where,
            orderBy: { date: "desc" },
        });

        const serialized = expenses.map((e) => ({
            id: e.id,
            date: e.date,
            description: e.description,
            amount: Number(e.amount),
            receiptUrl: e.receiptUrl,
            createdAt: e.createdAt,
        }));

        const total = serialized.reduce((sum, e) => sum + e.amount, 0);

        return { success: true, data: serialized, total };
    } catch (error) {
        console.error("Get Expenses Error:", error);
        return { success: false, error: "Failed to fetch expenses" };
    }
}

// ============================================
// DELETE EXPENSE
// ============================================
export async function deleteExpense(id: string) {
    try {
        await prisma.expense.delete({ where: { id } });
        revalidatePath("/expenses");
        return { success: true };
    } catch (error) {
        console.error("Delete Expense Error:", error);
        return { success: false, error: "Failed to delete expense" };
    }
}

// ============================================
// SCAN RECEIPT (AI Extraction)
// ============================================
export async function scanReceipt(formData: FormData) {
    const file = formData.get("file") as File;
    if (!file) {
        return { success: false, error: "No file uploaded" };
    }

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString("base64");

        const extracted = await extractDataFromReceipt(base64, file.type);

        if (!extracted) {
            return {
                success: false,
                error: "Could not extract data from receipt. Please try a clearer image.",
            };
        }

        return { success: true, data: extracted };
    } catch (error) {
        console.error("Scan Receipt Error:", error);
        return { success: false, error: "Failed to process receipt" };
    }
}
