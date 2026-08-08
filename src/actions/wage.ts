"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { WageType } from "@prisma/client";

// ============================================
// CREATE WORKER
// ============================================
export async function createWorker(data: { name: string; phone?: string }) {
    try {
        const worker = await prisma.worker.create({
            data: {
                name: data.name.trim(),
                phone: data.phone?.trim() || null,
                weeklyWage: 0, // Default required by existing schema
            },
        });

        revalidatePath("/wages");
        return {
            success: true,
            data: {
                id: worker.id,
                name: worker.name,
                balance: Number(worker.balance),
            },
        };
    } catch (error) {
        console.error("Create Worker Error:", error);
        return { success: false, error: "Failed to create worker" };
    }
}

// ============================================
// GET WORKERS (List)
// ============================================
export async function getWorkers() {
    try {
        const workers = await prisma.worker.findMany({
            where: { isActive: true },
            include: {
                wagePayments: {
                    orderBy: { date: "desc" },
                    take: 1,
                },
            },
            orderBy: { name: "asc" },
        });

        const serialized = workers.map((w) => ({
            id: w.id,
            name: w.name,
            phone: w.phone,
            balance: Number(w.balance),
            lastEntryDate: w.wagePayments[0]?.date || null,
            lastEntryType: w.wagePayments[0]?.type || null,
        }));

        return { success: true, data: serialized };
    } catch (error) {
        console.error("Get Workers Error:", error);
        return { success: false, error: "Failed to fetch workers" };
    }
}

// ============================================
// GET WORKER BY ID (Detail + Ledger)
// ============================================
export async function getWorkerById(id: string) {
    try {
        const worker = await prisma.worker.findUnique({
            where: { id },
            include: {
                wagePayments: {
                    orderBy: { date: "desc" },
                },
            },
        });

        if (!worker) {
            return { success: false, error: "Worker not found" };
        }

        return {
            success: true,
            data: {
                id: worker.id,
                name: worker.name,
                phone: worker.phone,
                balance: Number(worker.balance),
                isActive: worker.isActive,
                createdAt: worker.createdAt,
                wagePayments: worker.wagePayments.map((e) => ({
                    id: e.id,
                    date: e.date,
                    type: e.type as string,
                    amount: Number(e.amount),
                    notes: e.notes,
                    createdAt: e.createdAt,
                })),
            },
        };
    } catch (error) {
        console.error("Get Worker Error:", error);
        return { success: false, error: "Failed to fetch worker" };
    }
}

// ============================================
// CREATE WAGE ENTRY + UPDATE BALANCE
// ============================================
export async function createWageEntry(data: {
    workerId: string;
    type: WageType;
    amount: number;
    date: Date;
    description?: string;
}) {
    try {
        // Calculate balance change:
        // WAGE_PAYMENT & DEDUCTION → credit (increase balance, worker gets paid / debt reduced)
        // ADVANCE → debit (decrease balance, worker takes money)
        // ADJUSTMENT → can be positive or negative, applied directly
        let balanceChange = data.amount;
        if (data.type === "ADVANCE") {
            balanceChange = -data.amount; // Worker takes advance → owes more
        }

        const result = await prisma.$transaction(async (tx) => {
            const entry = await tx.wagePayment.create({
                data: {
                    workerId: data.workerId,
                    type: data.type,
                    amount: data.amount,
                    date: data.date,
                    notes: data.description?.trim() || null,
                },
            });

            const worker = await tx.worker.update({
                where: { id: data.workerId },
                data: {
                    balance: { increment: balanceChange },
                },
            });

            return { entry, worker };
        });

        revalidatePath(`/wages/${data.workerId}`);
        revalidatePath("/wages");

        return {
            success: true,
            data: {
                id: result.entry.id,
                newBalance: Number(result.worker.balance),
            },
        };
    } catch (error) {
        console.error("Create Wage Entry Error:", error);
        return { success: false, error: "Failed to record wage entry" };
    }
}

// ============================================
// DELETE WAGE ENTRY + RECALCULATE BALANCE
// ============================================
export async function deleteWageEntry(entryId: string) {
    try {
        const entry = await prisma.wagePayment.findUnique({
            where: { id: entryId },
        });

        if (!entry) {
            return { success: false, error: "Entry not found" };
        }

        // Reverse the balance change
        let reversal = -Number(entry.amount);
        if (entry.type === "ADVANCE") {
            reversal = Number(entry.amount); // Reverse: give balance back
        }

        await prisma.$transaction(async (tx) => {
            await tx.wagePayment.delete({ where: { id: entryId } });
            await tx.worker.update({
                where: { id: entry.workerId },
                data: { balance: { increment: reversal } },
            });
        });

        revalidatePath(`/wages/${entry.workerId}`);
        revalidatePath("/wages");

        return { success: true };
    } catch (error) {
        console.error("Delete Wage Entry Error:", error);
        return { success: false, error: "Failed to delete entry" };
    }
}
