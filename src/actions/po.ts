
"use server";

import { prisma } from "@/lib/prisma";

// Helper to serialize PO objects (convert Decimal to Number, Date to string)
function serializePO(po: any) {
    return {
        ...po,
        totalAmount: Number(po.totalAmount),
        subtotal: po.subtotal ? Number(po.subtotal) : 0,
        taxTotal: po.taxTotal ? Number(po.taxTotal) : 0,
        date: po.date instanceof Date ? po.date.toISOString() : po.date,
        createdAt: po.createdAt instanceof Date ? po.createdAt.toISOString() : po.createdAt,
        updatedAt: po.updatedAt instanceof Date ? po.updatedAt.toISOString() : po.updatedAt,
        // Handle nested customer if present
        customer: po.customer ? {
            ...po.customer,
            balance: po.customer.balance ? Number(po.customer.balance) : 0,
            creditLimit: po.customer.creditLimit ? Number(po.customer.creditLimit) : null
        } : undefined,
        // Handle nested items if present
        items: po.items?.map((item: any) => ({
            ...item,
            rate: Number(item.rate),
            amount: Number(item.amount),
            gstRate: Number(item.gstRate || 0)
        })),
        // Handle nested invoices if present
        invoices: po.invoices?.map((inv: any) => ({
            ...inv,
            total: inv.total ? Number(inv.total) : 0,
            date: inv.date instanceof Date ? inv.date.toISOString() : inv.date
        }))
    };
}

export async function getCustomerPOs(customerId: string) {
    try {
        const pos = await prisma.customerPurchaseOrder.findMany({
            where: { customerId },
            orderBy: { date: 'desc' },
            include: {
                _count: {
                    select: { items: true, invoices: true }
                }
            }
        });
        return { success: true, data: pos.map(serializePO) };
    } catch (error) {
        console.error("Get POs Error:", error);
        return { success: false, error: "Failed to fetch purchase orders" };
    }
}

export async function getCustomerPOById(id: string) {
    try {
        const po = await prisma.customerPurchaseOrder.findUnique({
            where: { id },
            include: {
                customer: true,
                items: true,
                invoices: {
                    select: { id: true, invoiceNo: true, total: true, date: true }
                }
            }
        });
        if (!po) return { success: false, error: "PO not found" };
        return { success: true, data: serializePO(po) };
    } catch (error) {
        return { success: false, error: "PO not found" };
    }
}

export async function getAllPOs() {
    try {
        const pos = await prisma.customerPurchaseOrder.findMany({
            orderBy: { date: 'desc' },
            include: {
                customer: {
                    select: { name: true, nameUrdu: true }
                },
                _count: {
                    select: { items: true, invoices: true }
                }
            }
        });
        return { success: true, data: pos.map(serializePO) };
    } catch (error) {
        console.error("Get All POs Error:", error);
        return { success: false, error: "Failed to fetch purchase orders" };
    }
}
