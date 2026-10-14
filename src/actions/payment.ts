"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canTransitionCheque } from "@/lib/finance";
import { syncInvoiceStatuses } from "@/lib/invoice-status";

// Validation schema for payment
const PaymentSchema = z.object({
    customerId: z.string().min(1, "Customer is required"),
    amount: z.number().positive("Amount must be positive"),
    method: z.enum(["CASH", "CHEQUE", "BANK_TRANSFER"]),
    notes: z.string().optional(),
    // Cheque-specific fields
    chequeNo: z.string().optional(),
    bankName: z.string().optional(),
    chequeDate: z.date().optional(),
    // Bank Transfer specific fields
    bankAccountId: z.string().optional(),
    senderBankName: z.string().optional(),
    senderAccountTitle: z.string().optional(),
});

export type PaymentFormValues = z.infer<typeof PaymentSchema>;

/**
 * Record a payment from a customer
 * This will:
 * 1. Create a Cheque record (if payment method is CHEQUE)
 * 2. Create a Payment record
 * 3. Update the customer's balance (decrease it)
 * 4. Create a credit LedgerEntry
 * All in an atomic transaction
 */
export async function recordPayment(data: PaymentFormValues) {
    try {
        const validated = PaymentSchema.parse(data);

        // Validate cheque fields if method is CHEQUE
        if (validated.method === "CHEQUE") {
            if (!validated.chequeNo || !validated.bankName || !validated.chequeDate) {
                return { success: false, error: "Cheque details are required for cheque payments" };
            }
        }

        // Validate bank fields if method is BANK_TRANSFER
        if (validated.method === "BANK_TRANSFER") {
            if (!validated.bankAccountId) {
                return { success: false, error: "Please select a bank account for deposit" };
            }
        }

        const customer = await prisma.customer.findUnique({
            where: { id: validated.customerId },
            select: { id: true }
        });

        if (!customer) {
            return { success: false, error: "Customer not found" };
        }

        // Perform atomic transaction
        const result = await prisma.$transaction(async (tx) => {
            let chequeId: string | null = null;

            // 1. Create Cheque record if payment is by cheque
            if (validated.method === "CHEQUE") {
                const cheque = await tx.cheque.create({
                    data: {
                        chequeNo: validated.chequeNo!,
                        bankName: validated.bankName!,
                        amount: validated.amount,
                        chequeDate: validated.chequeDate!,
                        customerId: validated.customerId,
                        status: "RECEIVED",
                    }
                });
                chequeId = cheque.id;
            }

            // 2. Create Payment record
            const payment = await tx.payment.create({
                data: {
                    customerId: validated.customerId,
                    amount: validated.amount,
                    method: validated.method,
                    chequeId: chequeId,
                    notes: validated.notes,
                    // Bank details
                    bankAccountId: validated.bankAccountId,
                    senderBankName: validated.senderBankName,
                    senderAccountTitle: validated.senderAccountTitle,
                }
            });

            // 3. Update customer balance atomically (a read-then-write here
            // could lose a concurrent invoice or payment)
            const updated = await tx.customer.update({
                where: { id: validated.customerId },
                data: { balance: { decrement: validated.amount } }
            });

            // 4. Create ledger entry (Credit side - customer paid us)
            const particularsText = validated.method === "CHEQUE"
                ? `Payment received (Cheque #${validated.chequeNo})`
                : validated.method === "BANK_TRANSFER"
                    ? "Payment received (Bank Transfer)"
                    : "Payment received (Cash)";

            await tx.ledgerEntry.create({
                data: {
                    customerId: validated.customerId,
                    paymentId: payment.id,
                    particulars: particularsText,
                    debit: 0,
                    credit: validated.amount,
                    balance: updated.balance,
                    date: new Date(),
                }
            });

            await syncInvoiceStatuses(tx, validated.customerId);

            return payment;
        });

        revalidatePath(`/customers/${validated.customerId}`);
        revalidatePath("/customers");
        revalidatePath("/invoices");
        revalidatePath("/cheques");

        return {
            success: true,
            data: {
                id: result.id,
                amount: Number(result.amount),
                method: result.method,
                createdAt: result.createdAt.toISOString(),
            }
        };

    } catch (error) {
        console.error("Record Payment Error:", error);
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0].message };
        }
        return { success: false, error: "Failed to record payment" };
    }
}

/**
 * Get all payments for a customer
 */
export async function getCustomerPayments(customerId: string) {
    try {
        const payments = await prisma.payment.findMany({
            where: { customerId },
            include: {
                cheque: true,
            },
            orderBy: { createdAt: "desc" }
        });

        return {
            success: true,
            data: payments.map(p => ({
                id: p.id,
                date: p.createdAt.toISOString(),
                amount: Number(p.amount),
                method: p.method,
                notes: p.notes,
                cheque: p.cheque ? {
                    id: p.cheque.id,
                    chequeNo: p.cheque.chequeNo,
                    bankName: p.cheque.bankName,
                    chequeDate: p.cheque.chequeDate.toISOString(),
                    status: p.cheque.status,
                } : null,
            }))
        };
    } catch (error) {
        console.error("Get Payments Error:", error);
        return { success: false, error: "Failed to fetch payments", data: [] };
    }
}

/**
 * Get all cheques with optional status filter
 */
export async function getCheques(status?: "RECEIVED" | "DEPOSITED" | "CLEARED" | "BOUNCED") {
    try {
        const cheques = await prisma.cheque.findMany({
            where: status ? { status } : undefined,
            include: {
                customer: {
                    select: { id: true, name: true, nameUrdu: true }
                }
            },
            orderBy: { chequeDate: "asc" }
        });

        return {
            success: true,
            data: cheques.map(c => ({
                id: c.id,
                chequeNo: c.chequeNo,
                bankName: c.bankName,
                amount: Number(c.amount),
                chequeDate: c.chequeDate.toISOString(),
                receivedDate: c.receivedDate.toISOString(),
                depositDate: c.depositDate?.toISOString() || null,
                clearDate: c.clearDate?.toISOString() || null,
                status: c.status,
                customer: c.customer,
            }))
        };
    } catch (error) {
        console.error("Get Cheques Error:", error);
        return { success: false, error: "Failed to fetch cheques", data: [] };
    }
}

/**
 * Update cheque status
 */
export async function updateChequeStatus(
    chequeId: string,
    newStatus: "DEPOSITED" | "CLEARED" | "BOUNCED"
) {
    try {
        const existing = await prisma.cheque.findUnique({
            where: { id: chequeId },
            include: { payment: true }
        });
        if (!existing) {
            return { success: false, error: "Cheque not found" };
        }
        if (!canTransitionCheque(existing.status, newStatus)) {
            return { success: false, error: `A ${existing.status.toLowerCase()} cheque cannot be marked ${newStatus.toLowerCase()}` };
        }

        const now = new Date();
        const cheque = await prisma.$transaction(async (tx) => {
            // Guard on the current status so two clicks can't bounce the same cheque twice
            const { count } = await tx.cheque.updateMany({
                where: { id: chequeId, status: existing.status },
                data: {
                    status: newStatus,
                    ...(newStatus === "DEPOSITED" && { depositDate: now }),
                    ...(newStatus === "CLEARED" && { clearDate: now }),
                }
            });
            if (count === 0) {
                throw new Error("Cheque status changed concurrently");
            }

            // A bounced cheque reverses the payment it was recorded against
            if (newStatus === "BOUNCED" && existing.payment) {
                const customer = await tx.customer.update({
                    where: { id: existing.customerId },
                    data: { balance: { increment: existing.payment.amount } }
                });

                await tx.ledgerEntry.create({
                    data: {
                        customerId: existing.customerId,
                        particulars: `Cheque bounced (#${existing.chequeNo})`,
                        debit: existing.payment.amount,
                        credit: 0,
                        balance: customer.balance,
                        date: now,
                    }
                });

                await syncInvoiceStatuses(tx, existing.customerId);
            }

            return tx.cheque.findUniqueOrThrow({ where: { id: chequeId } });
        });

        revalidatePath("/cheques");
        revalidatePath("/invoices");
        revalidatePath(`/customers/${existing.customerId}`);

        return {
            success: true,
            data: {
                id: cheque.id,
                status: cheque.status,
            }
        };
    } catch (error) {
        console.error("Update Cheque Status Error:", error);
        return { success: false, error: "Failed to update cheque status" };
    }
}

/**
 * Get all active bank accounts for dropdown
 */
export async function getBankAccounts() {
    try {
        const accounts = await prisma.bankAccount.findMany({
            where: { isActive: true },
            select: {
                id: true,
                bankName: true,
                accountTitle: true,
                accountNumberMasked: true
            },
            orderBy: { bankName: 'asc' }
        });
        return { success: true, data: accounts };
    } catch (error) {
        console.error("Get Bank Accounts Error:", error);
        return { success: false, error: "Failed to fetch bank accounts", data: [] };
    }
}
