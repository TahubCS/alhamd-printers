"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type DecimalLike = Prisma.Decimal | number | null | undefined;

const toNumber = (value: DecimalLike) => (value == null ? 0 : Number(value));

// Shared PO fields: Decimal -> number, Date -> ISO string so client components can receive them
function serializePOBase<T extends {
    totalAmount: DecimalLike;
    subtotal: DecimalLike;
    taxTotal: DecimalLike;
    date: Date;
    createdAt: Date;
    updatedAt: Date;
}>(po: T) {
    return {
        ...po,
        totalAmount: toNumber(po.totalAmount),
        subtotal: toNumber(po.subtotal),
        taxTotal: toNumber(po.taxTotal),
        date: po.date.toISOString(),
        createdAt: po.createdAt.toISOString(),
        updatedAt: po.updatedAt.toISOString(),
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
        return { success: true, data: pos.map(serializePOBase) };
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

        return {
            success: true,
            data: {
                ...serializePOBase(po),
                customer: po.customer ? {
                    ...po.customer,
                    balance: toNumber(po.customer.balance),
                    creditLimit: po.customer.creditLimit ? Number(po.customer.creditLimit) : null,
                } : null,
                items: po.items.map(item => ({
                    ...item,
                    rate: toNumber(item.rate),
                    amount: toNumber(item.amount),
                    gstRate: toNumber(item.gstRate),
                    customAttributes: (item.customAttributes ?? {}) as Record<string, string | null>,
                })),
                invoices: po.invoices.map(inv => ({
                    ...inv,
                    total: toNumber(inv.total),
                    date: inv.date.toISOString(),
                })),
            }
        };
    } catch (error) {
        console.error("Get PO Error:", error);
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
        return { success: true, data: pos.map(serializePOBase) };
    } catch (error) {
        console.error("Get All POs Error:", error);
        return { success: false, error: "Failed to fetch purchase orders" };
    }
}
