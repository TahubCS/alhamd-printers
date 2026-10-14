"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { calculateLine, roundMoney } from "@/lib/finance";

const optionalText = z.string().trim().optional().transform((value) => value || null);

const SupplierSchema = z.object({
    name: z.string().trim().min(1, "Supplier name is required"),
    nameUrdu: optionalText,
    phone: optionalText,
    address: optionalText,
    notes: optionalText,
});

const PurchaseSchema = z.object({
    supplierId: z.string().min(1, "Select a supplier"),
    date: z.coerce.date(),
    notes: optionalText,
    items: z
        .array(
            z.object({
                description: z.string().trim().min(1, "Every line needs a description"),
                specification: optionalText,
                materialId: z.string().optional().transform((value) => value || null),
                quantity: z.coerce.number().int("Quantities must be whole numbers").positive("Quantities must be greater than 0"),
                rate: z.coerce.number().min(0, "Rates cannot be negative"),
            })
        )
        .min(1, "Add at least one item"),
});

const ReceiptSchema = z
    .array(z.object({ itemId: z.string(), quantity: z.coerce.number().int().min(0) }))
    .refine((lines) => lines.some((line) => line.quantity > 0), "Enter a quantity to receive");

const SupplierPaymentSchema = z.object({
    supplierId: z.string().min(1),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    method: z.enum(["CASH", "CHEQUE", "BANK_TRANSFER"]),
    date: z.coerce.date(),
    reference: optionalText,
    notes: optionalText,
});

export type SupplierInput = z.input<typeof SupplierSchema>;
export type PurchaseInput = z.input<typeof PurchaseSchema>;
export type SupplierPaymentInput = z.input<typeof SupplierPaymentSchema>;

class PurchaseError extends Error {}

function failureMessage(error: unknown, fallback: string): string {
    if (error instanceof z.ZodError) return error.issues[0].message;
    if (error instanceof PurchaseError) return error.message;
    console.error(fallback, error);
    return fallback;
}

function revalidateSupplier(supplierId?: string) {
    revalidatePath("/suppliers");
    revalidatePath("/inventory");
    if (supplierId) revalidatePath(`/suppliers/${supplierId}`);
}

// ============================================
// SUPPLIERS
// ============================================
export async function getSuppliers() {
    try {
        const suppliers = await prisma.supplier.findMany({
            orderBy: { name: "asc" },
            include: {
                purchaseOrders: { where: { status: { in: ["PENDING", "PARTIAL"] } }, select: { id: true } },
            },
        });
        return {
            success: true,
            data: suppliers.map((s) => ({
                id: s.id,
                name: s.name,
                nameUrdu: s.nameUrdu,
                phone: s.phone,
                balance: Number(s.balance),
                openOrders: s.purchaseOrders.length,
            })),
        };
    } catch (error) {
        return { success: false, error: failureMessage(error, "Failed to fetch suppliers"), data: [] };
    }
}

export async function getSupplierById(id: string) {
    try {
        const supplier = await prisma.supplier.findUnique({
            where: { id },
            include: {
                purchaseOrders: { orderBy: { date: "desc" }, include: { items: true } },
                payments: { orderBy: { date: "desc" } },
            },
        });
        if (!supplier) return { success: false, error: "Supplier not found" };

        const orders = supplier.purchaseOrders.map((po) => ({
            id: po.id,
            poNumber: po.poNumber,
            date: po.date,
            status: po.status,
            total: Number(po.total),
            receivedValue: roundMoney(po.items.reduce((sum, item) => sum + item.receivedQuantity * Number(item.rate), 0)),
        }));
        const payments = supplier.payments.map((p) => ({
            id: p.id,
            date: p.date,
            amount: Number(p.amount),
            method: p.method,
            reference: p.reference,
            notes: p.notes,
        }));

        return {
            success: true,
            data: {
                id: supplier.id,
                name: supplier.name,
                nameUrdu: supplier.nameUrdu,
                phone: supplier.phone,
                address: supplier.address,
                notes: supplier.notes,
                balance: Number(supplier.balance),
                orders,
                payments,
                totals: {
                    purchased: roundMoney(orders.reduce((sum, o) => sum + o.receivedValue, 0)),
                    paid: roundMoney(payments.reduce((sum, p) => sum + p.amount, 0)),
                },
            },
        };
    } catch (error) {
        return { success: false, error: failureMessage(error, "Failed to fetch supplier") };
    }
}

export async function saveSupplier(id: string | null, input: SupplierInput) {
    try {
        const data = SupplierSchema.parse(input);
        const supplier = id
            ? await prisma.supplier.update({ where: { id }, data })
            : await prisma.supplier.create({ data });
        revalidateSupplier(supplier.id);
        return { success: true, data: { id: supplier.id } };
    } catch (error) {
        return { success: false, error: failureMessage(error, "Failed to save supplier") };
    }
}

// ============================================
// PURCHASE ORDERS (buying raw materials)
// ============================================
export async function createPurchaseOrder(input: PurchaseInput) {
    try {
        const data = PurchaseSchema.parse(input);
        const lines = data.items.map((item) => ({ ...item, amount: calculateLine(item).amount }));
        const total = roundMoney(lines.reduce((sum, line) => sum + line.amount, 0));

        const po = await prisma.purchaseOrder.create({
            data: {
                supplierId: data.supplierId,
                date: data.date,
                notes: data.notes,
                total,
                items: { create: lines },
            },
        });
        revalidateSupplier(data.supplierId);
        return { success: true, data: { id: po.id, poNumber: po.poNumber } };
    } catch (error) {
        return { success: false, error: failureMessage(error, "Failed to create purchase order") };
    }
}

export async function getPurchaseOrderById(id: string) {
    try {
        const po = await prisma.purchaseOrder.findUnique({
            where: { id },
            include: {
                supplier: { select: { id: true, name: true, nameUrdu: true, phone: true, address: true } },
                items: { include: { material: { select: { id: true, name: true } } } },
            },
        });
        if (!po) return { success: false, error: "Purchase order not found" };
        return {
            success: true,
            data: {
                id: po.id,
                poNumber: po.poNumber,
                date: po.date,
                status: po.status,
                notes: po.notes,
                total: Number(po.total),
                supplier: po.supplier,
                items: po.items.map((item) => ({
                    id: item.id,
                    description: item.description,
                    specification: item.specification,
                    quantity: item.quantity,
                    receivedQuantity: item.receivedQuantity,
                    remaining: item.quantity - item.receivedQuantity,
                    rate: Number(item.rate),
                    amount: Number(item.amount),
                    material: item.material,
                })),
            },
        };
    } catch (error) {
        return { success: false, error: failureMessage(error, "Failed to fetch purchase order") };
    }
}

/**
 * Record goods arriving against a purchase order. Received quantities are added
 * to the linked raw material's stock and their value to the supplier balance.
 */
export async function receivePurchaseOrder(purchaseOrderId: string, receipts: { itemId: string; quantity: number | string }[]) {
    try {
        const lines = ReceiptSchema.parse(receipts);

        const po = await prisma.$transaction(async (tx) => {
            const order = await tx.purchaseOrder.findUnique({
                where: { id: purchaseOrderId },
                include: { items: true, supplier: { select: { name: true } } },
            });
            if (!order) throw new PurchaseError("Purchase order not found");
            if (order.status === "CANCELLED" || order.status === "RECEIVED") {
                throw new PurchaseError(`This purchase order is already ${order.status.toLowerCase()}`);
            }

            let receivedValue = 0;
            for (const line of lines) {
                if (line.quantity === 0) continue;
                const item = order.items.find((i) => i.id === line.itemId);
                if (!item) throw new PurchaseError("A line does not belong to this purchase order");

                // Conditional update so two simultaneous receipts can't exceed the ordered quantity
                const { count } = await tx.purchaseOrderItem.updateMany({
                    where: { id: item.id, receivedQuantity: { lte: item.quantity - line.quantity } },
                    data: { receivedQuantity: { increment: line.quantity } },
                });
                if (count === 0) {
                    throw new PurchaseError(`"${item.description}" has only ${item.quantity - item.receivedQuantity} left to receive`);
                }

                receivedValue += calculateLine({ quantity: line.quantity, rate: Number(item.rate) }).amount;

                if (item.materialId) {
                    await tx.rawMaterial.update({
                        where: { id: item.materialId },
                        data: {
                            quantity: { increment: line.quantity },
                            transactions: {
                                create: {
                                    type: "IN",
                                    quantity: line.quantity,
                                    notes: `Received on purchase #${order.poNumber} from ${order.supplier.name}`,
                                    purchaseOrderId: order.id,
                                },
                            },
                        },
                    });
                }
            }

            await tx.supplier.update({
                where: { id: order.supplierId },
                data: { balance: { increment: roundMoney(receivedValue) } },
            });

            const items = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: order.id } });
            const fullyReceived = items.every((i) => i.receivedQuantity >= i.quantity);
            return tx.purchaseOrder.update({
                where: { id: order.id },
                data: { status: fullyReceived ? "RECEIVED" : "PARTIAL" },
            });
        });

        revalidateSupplier(po.supplierId);
        return { success: true, data: { status: po.status } };
    } catch (error) {
        return { success: false, error: failureMessage(error, "Failed to receive goods") };
    }
}

export async function cancelPurchaseOrder(id: string) {
    try {
        const { count } = await prisma.purchaseOrder.updateMany({
            where: { id, status: "PENDING", items: { every: { receivedQuantity: 0 } } },
            data: { status: "CANCELLED" },
        });
        if (count === 0) {
            return { success: false, error: "Only purchase orders with nothing received can be cancelled" };
        }
        revalidateSupplier();
        return { success: true };
    } catch (error) {
        return { success: false, error: failureMessage(error, "Failed to cancel purchase order") };
    }
}

// ============================================
// SUPPLIER PAYMENTS
// ============================================
export async function recordSupplierPayment(input: SupplierPaymentInput) {
    try {
        const data = SupplierPaymentSchema.parse(input);
        await prisma.$transaction([
            prisma.supplierPayment.create({ data }),
            prisma.supplier.update({ where: { id: data.supplierId }, data: { balance: { decrement: data.amount } } }),
        ]);
        revalidateSupplier(data.supplierId);
        return { success: true };
    } catch (error) {
        return { success: false, error: failureMessage(error, "Failed to record payment") };
    }
}
