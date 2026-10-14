"use server";

import { prisma } from "@/lib/prisma";
import { InvoiceStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { addDays, calculateDocumentTotals, effectiveInvoiceStatus } from "@/lib/finance";
import { syncInvoiceStatuses, syncPOStatus } from "@/lib/invoice-status";

export async function getInvoices(filters?: {
    companyId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: string;
}) {
    try {
        const where: Prisma.InvoiceWhereInput = {};

        if (filters?.companyId) {
            where.companyId = filters.companyId;
        }

        if (filters?.startDate || filters?.endDate) {
            where.date = {
                ...(filters.startDate && { gte: filters.startDate }),
                ...(filters.endDate && { lte: filters.endDate }),
            };
        }

        if (filters?.status && filters.status in InvoiceStatus) {
            where.status = filters.status as InvoiceStatus;
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
            taxTotal: Number(invoice.taxTotal || 0),
            total: Number(invoice.total),
            status: effectiveInvoiceStatus(invoice.status, invoice.dueDate),
            // Serialize nested customer Decimals
            customer: invoice.customer ? {
                ...invoice.customer,
                creditLimit: invoice.customer.creditLimit ? Number(invoice.customer.creditLimit) : null,
                balance: Number(invoice.customer.balance),
            } : undefined,
        }));

        return { success: true, data: serializedInvoices };
    } catch (error) {
        console.error("Get Invoices Error:", error);
        return { success: false, error: "Failed to fetch invoices" };
    }
}

export async function getInvoiceDetailsForPDF(id: string) {
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

        // Explicit serialization to ensure no Decimals leak
        const serializedInvoice = {
            id: invoice.id,
            invoiceNo: invoice.invoiceNo,
            date: invoice.date,
            dueDate: invoice.dueDate,
            creditDays: invoice.creditDays,
            status: effectiveInvoiceStatus(invoice.status, invoice.dueDate),
            notes: invoice.notes,
            createdAt: invoice.createdAt,
            updatedAt: invoice.updatedAt,
            companyId: invoice.companyId,
            customerId: invoice.customerId,
            customerPurchaseOrderId: invoice.customerPurchaseOrderId,

            // Decimal Fields (Explicitly Cast to Number)
            subtotal: Number(invoice.subtotal),
            taxTotal: Number(invoice.taxTotal || 0),
            total: Number(invoice.total),

            // Relations
            company: invoice.company,
            customer: {
                ...invoice.customer,
                creditLimit: invoice.customer.creditLimit ? Number(invoice.customer.creditLimit) : null,
                balance: Number(invoice.customer.balance),
            },
            items: invoice.items.map(item => ({
                id: item.id,
                description: item.description,
                quantity: item.quantity,
                // Decimals
                rate: Number(item.rate),
                amount: Number(item.amount),
                gstRate: Number(item.gstRate || 0),
                sizeWidth: item.sizeWidth ? Number(item.sizeWidth) : null,
                sizeLength: item.sizeLength ? Number(item.sizeLength) : null,
                sizeDepth: item.sizeDepth ? Number(item.sizeDepth) : null,
                product: item.product ? {
                    ...item.product,
                    basePrice: Number(item.product.basePrice),
                    buttonPrice: item.product.buttonPrice ? Number(item.product.buttonPrice) : null,
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
        console.error("Get Invoice Details Error:", error);
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
        amount?: number;
        gstRate?: number;
        sizeWidth?: number;
        sizeLength?: number;
        sizeDepth?: number;
    }[];
}) {
    try {
        const items = data.items.filter(item => item.description.trim() !== "");
        if (items.length === 0) {
            return { success: false, error: "Add at least one line item" };
        }
        if (items.some(item => !(item.quantity > 0) || item.rate < 0 || (item.gstRate ?? 0) < 0)) {
            return { success: false, error: "Quantities must be positive and rates cannot be negative" };
        }
        if (data.creditDays < 0) {
            return { success: false, error: "Credit days cannot be negative" };
        }

        const dueDate = addDays(data.date, data.creditDays);

        // Never trust client-side amounts: recompute every line and the totals here
        const { lines, subtotal, taxTotal, total } = calculateDocumentTotals(items);

        const result = await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.create({
                data: {
                    companyId: data.companyId,
                    customerId: data.customerId,
                    date: data.date,
                    dueDate,
                    creditDays: data.creditDays,
                    notes: data.notes,
                    subtotal,
                    taxTotal,
                    total,
                    status: 'PENDING',
                    customerPurchaseOrderId: data.customerPurchaseOrderId,
                    items: {
                        create: items.map((item, index) => ({
                            productId: item.productId || null,
                            description: item.description.trim(),
                            quantity: item.quantity,
                            rate: item.rate,
                            amount: lines[index].amount,
                            gstRate: item.gstRate || 0,
                            sizeWidth: item.sizeWidth,
                            sizeLength: item.sizeLength,
                            sizeDepth: item.sizeDepth
                        }))
                    }
                }
            });

            // Debit the customer and record the running balance atomically
            const customer = await tx.customer.update({
                where: { id: data.customerId },
                data: { balance: { increment: total } }
            });

            await tx.ledgerEntry.create({
                data: {
                    date: data.date,
                    customerId: data.customerId,
                    invoiceId: invoice.id,
                    particulars: `Invoice #${invoice.invoiceNo}`,
                    debit: total,
                    credit: 0,
                    balance: customer.balance
                }
            });

            if (data.customerPurchaseOrderId) {
                await syncPOStatus(tx, data.customerPurchaseOrderId);
            }
            await syncInvoiceStatuses(tx, data.customerId);

            return invoice;
        });

        revalidatePath('/invoices');
        revalidatePath('/customers');
        revalidatePath('/purchase-orders');

        return {
            success: true,
            data: {
                id: result.id,
                invoiceNo: result.invoiceNo,
                subtotal: Number(result.subtotal),
                taxTotal: Number(result.taxTotal || 0),
                total: Number(result.total),
            }
        };

    } catch (error) {
        console.error("Create Invoice Error:", error);
        return { success: false, error: "Failed to create invoice" };
    }
}

export async function deleteInvoice(id: string) {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: { ledgerEntry: true }
        });

        if (!invoice) {
            return { success: false, error: "Invoice not found" };
        }

        await prisma.$transaction(async (tx) => {
            const customer = await tx.customer.update({
                where: { id: invoice.customerId },
                data: { balance: { decrement: invoice.total } }
            });

            // Keep the original debit in the ledger and post a reversing credit,
            // so the statement still explains how the balance moved
            if (invoice.ledgerEntry) {
                await tx.ledgerEntry.update({
                    where: { id: invoice.ledgerEntry.id },
                    data: { invoiceId: null }
                });
            }
            await tx.ledgerEntry.create({
                data: {
                    customerId: invoice.customerId,
                    particulars: `Invoice #${invoice.invoiceNo} cancelled`,
                    debit: 0,
                    credit: invoice.total,
                    balance: customer.balance,
                }
            });

            await tx.invoice.delete({ where: { id } }); // items cascade

            if (invoice.customerPurchaseOrderId) {
                await syncPOStatus(tx, invoice.customerPurchaseOrderId);
            }
            await syncInvoiceStatuses(tx, invoice.customerId);
        });

        revalidatePath('/invoices');
        revalidatePath('/customers');
        revalidatePath('/purchase-orders');
        return { success: true };

    } catch (error) {
        console.error("Delete Invoice Error:", error);
        return { success: false, error: "Failed to delete invoice" };
    }
}
