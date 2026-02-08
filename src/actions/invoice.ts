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

        const serializedInvoices = invoices.map(invoice => ({
            ...invoice,
            subtotal: Number(invoice.subtotal),
            total: Number(invoice.total),
        }));

        return { success: true, data: serializedInvoices };
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

        const serializedInvoice = {
            ...invoice,
            subtotal: Number(invoice.subtotal),
            taxTotal: Number(invoice.taxTotal || 0), // Handle potential null/undefined for old records if any
            total: Number(invoice.total),
            items: invoice.items.map(item => ({
                ...item,
                rate: Number(item.rate),
                amount: Number(item.amount),
                gstRate: Number(item.gstRate || 0),
                product: item.product ? {
                    ...item.product,
                    basePrice: Number(item.product.basePrice),
                } : null
            })),
            ledgerEntry: invoice.ledgerEntry ? {
                ...invoice.ledgerEntry,
                debit: Number(invoice.ledgerEntry.debit),
                credit: Number(invoice.ledgerEntry.credit),
                balance: Number(invoice.ledgerEntry.balance),
            } : null
        };

        return { success: true, data: serializedInvoice };
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
    customerPurchaseOrderId?: string;
    items: {
        productId?: string;
        description: string;
        quantity: number;
        rate: number;
        amount: number;
        gstRate?: number; // New optional field
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
        const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);

        // Calculate Tax Total
        // Formula: item.amount * (item.gstRate / 100)
        let taxTotal = 0;
        data.items.forEach(item => {
            const rate = item.gstRate || 0;
            const tax = (item.amount * rate) / 100;
            taxTotal += tax;
        });

        const total = subtotal + taxTotal;

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
                    subtotal: subtotal,
                    taxTotal: taxTotal,
                    total: total,
                    status: 'PENDING',
                    customerPurchaseOrderId: data.customerPurchaseOrderId, // Linked PO
                    items: {
                        create: data.items.map(item => ({
                            productId: item.productId || null,
                            description: item.description,
                            quantity: item.quantity,
                            rate: item.rate,
                            amount: item.amount,
                            gstRate: item.gstRate || 0,
                            sizeWidth: item.sizeWidth,
                            sizeLength: item.sizeLength,
                            sizeDepth: item.sizeDepth
                        }))
                    }
                }
            });

            // 1b. Update PO Status if linked
            if (data.customerPurchaseOrderId) {
                const po = await tx.customerPurchaseOrder.findUnique({
                    where: { id: data.customerPurchaseOrderId },
                    select: { totalAmount: true, invoices: { select: { total: true } } }
                });

                if (po) {
                    // Calculate total invoiced amount for this PO (including past invoices)
                    const pastTotal = po.invoices.reduce((sum: number, inv: { total: any }) => sum + Number(inv.total), 0);
                    const newTotalInvoiced = pastTotal + total; // current invoice total

                    // Check if fully invoiced
                    const status = newTotalInvoiced >= Number(po.totalAmount) ? 'CLOSED' : 'PARTIAL';

                    await tx.customerPurchaseOrder.update({
                        where: { id: data.customerPurchaseOrderId },
                        data: { status }
                    });
                }
            }

            // 2. Create Ledger Entry (Debit Customer)
            const ledgerEntry = await tx.ledgerEntry.create({
                data: {
                    date: data.date,
                    customerId: data.customerId,
                    invoiceId: invoice.id,
                    particulars: `Invoice #${invoice.invoiceNo}`,
                    debit: total, // Debit the full amount including tax
                    credit: 0,
                    balance: 0
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
            await tx.ledgerEntry.update({
                where: { id: ledgerEntry.id },
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
