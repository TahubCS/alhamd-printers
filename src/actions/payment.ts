"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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

        // Get current customer balance
        const customer = await prisma.customer.findUnique({
            where: { id: validated.customerId },
            select: { balance: true, name: true }
        });

        if (!customer) {
            return { success: false, error: "Customer not found" };
        }

        const currentBalance = Number(customer.balance);
        const newBalance = currentBalance - validated.amount; // Payment reduces balance

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

            // 3. Update customer balance
            await tx.customer.update({
                where: { id: validated.customerId },
                data: { balance: newBalance }
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
                    balance: newBalance,
                    date: new Date(),
                }
            });

            return payment;
        });

        revalidatePath(`/customers/${validated.customerId}`);
        revalidatePath("/customers");

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
        const updateData: {
            status: typeof newStatus;
            depositDate?: Date;
            clearDate?: Date;
        } = { status: newStatus };

        // Set appropriate date based on status
        if (newStatus === "DEPOSITED") {
            updateData.depositDate = new Date();
        } else if (newStatus === "CLEARED") {
            updateData.clearDate = new Date();
        }

        const cheque = await prisma.cheque.update({
            where: { id: chequeId },
            data: updateData
        });

        // If cheque bounced, we need to reverse the payment
        if (newStatus === "BOUNCED") {
            // Get the payment associated with this cheque
            const payment = await prisma.payment.findUnique({
                where: { chequeId: chequeId },
                include: { customer: true }
            });

            if (payment) {
                const currentBalance = Number(payment.customer.balance);
                const newBalance = currentBalance + Number(payment.amount); // Add back the amount

                await prisma.$transaction(async (tx) => {
                    // Update customer balance (add back the amount)
                    await tx.customer.update({
                        where: { id: payment.customerId },
                        data: { balance: newBalance }
                    });

                    // Create a debit entry for the bounced cheque
                    await tx.ledgerEntry.create({
                        data: {
                            customerId: payment.customerId,
                            particulars: `Cheque bounced (#${cheque.chequeNo})`,
                            debit: Number(payment.amount),
                            credit: 0,
                            balance: newBalance,
                            date: new Date(),
                        }
                    });
                });

                revalidatePath(`/customers/${payment.customerId}`);
            }
        }

        revalidatePath("/cheques");

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
