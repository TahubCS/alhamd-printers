"use server";

import { prisma } from "@/lib/prisma";
import { CustomerSchema, CustomerFormValues } from "@/lib/validations/customer";
import { revalidatePath } from "next/cache";

export async function createCustomer(data: CustomerFormValues) {
    try {
        const validated = CustomerSchema.parse(data);

        // Check for duplicate email if provided
        if (validated.email) {
            const existing = await prisma.customer.findUnique({
                where: { email: validated.email },
            });
            if (existing) {
                return { success: false, error: "Email already exists" };
            }
        }

        const customer = await prisma.customer.create({
            data: {
                name: validated.name,
                nameUrdu: validated.nameUrdu,
                phone: validated.phone,
                address: validated.address,
                email: validated.email,
                creditLimit: validated.creditLimit,
                isBadDebt: validated.isBadDebt,
                // If opening balance is provided, we set the initial balance
                // A separate ledger entry for opening balance should be created if balance > 0
                balance: validated.openingBalance || 0,
            },
        });

        if (validated.openingBalance && validated.openingBalance > 0) {
            // Create opening balance ledger entry
            await prisma.ledgerEntry.create({
                data: {
                    customerId: customer.id,
                    particulars: "Opening Balance",
                    debit: validated.openingBalance, // Assuming positive balance means they owe us (Debit)
                    credit: 0,
                    balance: validated.openingBalance,
                    date: new Date(),
                },
            });
        }

        revalidatePath("/customers");
        return { success: true, data: customer };
    } catch (error) {
        console.error("Create Customer Error:", error);
        return { success: false, error: "Failed to create customer" };
    }
}

export async function updateCustomer(id: string, data: CustomerFormValues) {
    try {
        const validated = CustomerSchema.parse(data);

        // Check for duplicate email if changed
        if (validated.email) {
            const existing = await prisma.customer.findFirst({
                where: {
                    email: validated.email,
                    NOT: { id }
                },
            });
            if (existing) {
                return { success: false, error: "Email already exists" };
            }
        }

        const customer = await prisma.customer.update({
            where: { id },
            data: {
                name: validated.name,
                nameUrdu: validated.nameUrdu,
                phone: validated.phone,
                address: validated.address,
                email: validated.email,
                creditLimit: validated.creditLimit,
                isBadDebt: validated.isBadDebt,
                // Balance is updated via transactions, not directly here usually
                // But for corrections, we might want to allow it? 
                // For now, let's NOT update balance directly to preserve ledger integrity
            },
        });

        revalidatePath("/customers");
        revalidatePath(`/customers/${id}`);
        return { success: true, data: customer };
    } catch (error) {
        console.error("Update Customer Error:", error);
        return { success: false, error: "Failed to update customer" };
    }
}

export async function getCustomers(query?: string) {
    try {
        const customers = await prisma.customer.findMany({
            where: query
                ? {
                    OR: [
                        { name: { contains: query, mode: "insensitive" } },
                        { nameUrdu: { contains: query, mode: "insensitive" } },
                        { phone: { contains: query, mode: "insensitive" } },
                    ],
                }
                : undefined,
            orderBy: { updatedAt: "desc" },
        });
        return { success: true, data: customers };
    } catch (error) {
        console.error("Get Customers Error:", error);
        return { success: false, error: "Failed to fetch customers" };
    }
}

export async function getCustomerById(id: string) {
    try {
        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { invoices: true, payments: true },
                },
            },
        });
        return { success: true, data: customer };
    } catch (error) {
        console.error("Get Customer Error:", error);
        return { success: false, error: "Failed to fetch customer" };
    }
}

export async function getCustomerLedger(customerId: string) {
    try {
        const ledger = await prisma.ledgerEntry.findMany({
            where: { customerId },
            orderBy: { date: "desc" }, // Show newest first
            include: {
                invoice: {
                    select: { invoiceNo: true },
                },
                payment: {
                    select: { method: true, notes: true },
                },
            },
        });
        return { success: true, data: ledger };
    } catch (error) {
        console.error("Get Ledger Error:", error);
        return { success: false, error: "Failed to fetch ledger" };
    }
}
