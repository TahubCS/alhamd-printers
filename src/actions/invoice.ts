"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getInvoices(filters?: {
    companyId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: string;
}) {
    try {
        const where: any = {};

        if (filters?.companyId) {
            where.companyId = filters.companyId;
        }

        if (filters?.startDate || filters?.endDate) {
            where.date = {};
            if (filters.startDate) where.date.gte = filters.startDate;
            if (filters.endDate) where.date.lte = filters.endDate;
        }

        if (filters?.status) {
            where.status = filters.status;
        }

        const invoices = await prisma.invoice.findMany({
            where,
            include: {
                company: true,
                customer: true,
                _count: {
                    select: { items: true }
                }
            },
            orderBy: {
                invoiceNo: 'desc'
            }
        });

        return { success: true, data: invoices };
    } catch (error) {
        console.error("Get Invoices Error:", error);
        return { success: false, error: "Failed to fetch invoices" };
    }
}

export async function getInvoiceById(id: string) {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                company: true,
                customer: true,
                items: {
                    include: {
                        product: true
                    }
                },
                ledgerEntry: true
            }
        });

        if (!invoice) {
            return { success: false, error: "Invoice not found" };
        }

        return { success: true, data: invoice };
    } catch (error) {
        console.error("Get Invoice Error:", error);
        return { success: false, error: "Failed to fetch invoice" };
    }
}
export async function createInvoice(data: {
    companyId: string;
    customerId: string;
    date: Date;
    creditDays: number;
    notes?: string;
    items: {
        productId?: string;
        description: string;
        quantity: number;
        rate: number;
        amount: number;
        sizeWidth?: number;
        sizeLength?: number;
        sizeDepth?: number;
    }[];
}) {
    try {
        // Calculate due date
        const dueDate = new Date(data.date);
        dueDate.setDate(dueDate.getDate() + data.creditDays);

        // Calculate totals
        const total = data.items.reduce((sum, item) => sum + item.amount, 0);

        // Transaction: Invoice -> Items -> Ledger -> Customer Balance
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Invoice
            const invoice = await tx.invoice.create({
                data: {
                    companyId: data.companyId,
                    customerId: data.customerId,
                    date: data.date,
                    dueDate: dueDate,
                    creditDays: data.creditDays,
                    notes: data.notes,
                    subtotal: total,
                    total: total,
                    status: 'PENDING',
                    items: {
                        create: data.items.map(item => ({
                            productId: item.productId || null,
                            description: item.description,
                            quantity: item.quantity,
                            rate: item.rate,
                            amount: item.amount,
                            sizeWidth: item.sizeWidth,
                            sizeLength: item.sizeLength,
                            sizeDepth: item.sizeDepth
                        }))
                    }
                }
            });

            // 2. Create Ledger Entry (Debit Customer)
            await tx.ledgerEntry.create({
                data: {
                    date: data.date,
                    customerId: data.customerId,
                    invoiceId: invoice.id,
                    particulars: `Invoice #${invoice.invoiceNo}`,
                    debit: total,
                    credit: 0,
                    balance: 0 // Will be updated by trigger or calc? 
                    // Prisma doesn't support triggers natively for balance calc in app logic easily 
                    // without reading previous balance.
                    // For now, we will fetch current balance and add to it.
                }
            });

            // 3. Update Customer Balance
            const customer = await tx.customer.update({
                where: { id: data.customerId },
                data: {
                    balance: { increment: total }
                }
            });

            // 4. Update the Ledger Entry with the new running balance
            // This is a simplification. Real accounting needs strict ordering.
            // For this app, simply storing the snapshot balance is okay for now.
            await tx.ledgerEntry.update({
                where: { invoiceId: invoice.id },
                data: {
                    balance: customer.balance
                }
            });

            return invoice;
        });

        revalidatePath('/invoices');
        revalidatePath('/customers');
        return { success: true, data: result };

    } catch (error) {
        console.error("Create Invoice Error:", error);
        return { success: false, error: "Failed to create invoice" };
    }
}
