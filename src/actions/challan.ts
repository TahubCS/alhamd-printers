"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ChallanSchema = z.object({
    customerId: z.string().min(1, "Select a customer"),
    date: z.coerce.date(),
    customerPurchaseOrderId: z.string().optional().transform((value) => value || null),
    vehicleNo: z.string().trim().optional().transform((value) => value || null),
    driverName: z.string().trim().optional().transform((value) => value || null),
    notes: z.string().trim().optional().transform((value) => value || null),
    items: z
        .array(
            z.object({
                description: z.string().trim().min(1, "Every line needs a description"),
                quantity: z.coerce.number().int("Quantities must be whole numbers").positive("Quantities must be greater than 0"),
                unit: z.string().trim().optional().transform((value) => value || "Pieces"),
                customerPurchaseOrderItemId: z.string().optional().transform((value) => value || null),
            })
        )
        .min(1, "Add at least one item"),
});

export type ChallanInput = z.input<typeof ChallanSchema>;

class ChallanValidationError extends Error {}

/** Ordered, already delivered and remaining quantity for each line of a customer PO. */
export async function getPODeliveryStatus(purchaseOrderId: string) {
    try {
        const po = await prisma.customerPurchaseOrder.findUnique({
            where: { id: purchaseOrderId },
            select: {
                id: true,
                poNumber: true,
                customerId: true,
                items: {
                    select: {
                        id: true,
                        description: true,
                        quantity: true,
                        unit: true,
                        deliveredItems: { select: { quantity: true } },
                    },
                },
            },
        });
        if (!po) return { success: false, error: "Purchase order not found" };

        return {
            success: true,
            data: {
                id: po.id,
                poNumber: po.poNumber,
                customerId: po.customerId,
                lines: po.items.map((item) => {
                    const delivered = item.deliveredItems.reduce((sum, d) => sum + d.quantity, 0);
                    return {
                        id: item.id,
                        description: item.description,
                        unit: item.unit ?? "Pieces",
                        ordered: item.quantity,
                        delivered,
                        remaining: Math.max(0, item.quantity - delivered),
                    };
                }),
            },
        };
    } catch (error) {
        console.error("Get PO Delivery Status Error:", error);
        return { success: false, error: "Failed to load purchase order" };
    }
}

export async function getChallans() {
    try {
        const challans = await prisma.deliveryChallan.findMany({
            orderBy: { challanNo: "desc" },
            include: {
                customer: { select: { id: true, name: true, nameUrdu: true } },
                items: { select: { quantity: true } },
            },
        });
        return {
            success: true,
            data: challans.map((challan) => ({
                id: challan.id,
                challanNo: challan.challanNo,
                date: challan.date,
                poNumber: challan.poNumber,
                vehicleNo: challan.vehicleNo,
                customer: challan.customer,
                lineCount: challan.items.length,
                totalQuantity: challan.items.reduce((sum, item) => sum + item.quantity, 0),
            })),
        };
    } catch (error) {
        console.error("Get Challans Error:", error);
        return { success: false, error: "Failed to fetch delivery challans", data: [] };
    }
}

export async function getChallanById(id: string) {
    try {
        const [challan, company] = await Promise.all([
            prisma.deliveryChallan.findUnique({
                where: { id },
                include: {
                    customer: { select: { id: true, name: true, nameUrdu: true, address: true, phone: true } },
                    items: true,
                },
            }),
            prisma.company.findFirst({ orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }),
        ]);
        if (!challan) return { success: false, error: "Delivery challan not found" };
        return { success: true, data: { ...challan, company } };
    } catch (error) {
        console.error("Get Challan Error:", error);
        return { success: false, error: "Failed to fetch delivery challan" };
    }
}

export async function createChallan(input: ChallanInput) {
    try {
        const data = ChallanSchema.parse(input);

        const challan = await prisma.$transaction(async (tx) => {
            let poNumber: string | null = null;

            if (data.customerPurchaseOrderId) {
                const po = await tx.customerPurchaseOrder.findUnique({
                    where: { id: data.customerPurchaseOrderId },
                    include: { items: { include: { deliveredItems: { select: { quantity: true } } } } },
                });
                if (!po || po.customerId !== data.customerId) {
                    throw new ChallanValidationError("The purchase order does not belong to this customer");
                }
                poNumber = po.poNumber;

                // Never dispatch more than was ordered on a PO line
                for (const item of data.items) {
                    if (!item.customerPurchaseOrderItemId) continue;
                    const line = po.items.find((poItem) => poItem.id === item.customerPurchaseOrderItemId);
                    if (!line) throw new ChallanValidationError("A line does not belong to the selected purchase order");
                    const delivered = line.deliveredItems.reduce((sum, d) => sum + d.quantity, 0);
                    const remaining = line.quantity - delivered;
                    if (item.quantity > remaining) {
                        throw new ChallanValidationError(`"${line.description}" has only ${Math.max(0, remaining)} left to deliver`);
                    }
                }
            } else if (data.items.some((item) => item.customerPurchaseOrderItemId)) {
                throw new ChallanValidationError("PO lines require a purchase order");
            }

            return tx.deliveryChallan.create({
                data: {
                    customerId: data.customerId,
                    date: data.date,
                    customerPurchaseOrderId: data.customerPurchaseOrderId,
                    poNumber,
                    vehicleNo: data.vehicleNo,
                    driverName: data.driverName,
                    notes: data.notes,
                    items: { create: data.items },
                },
            });
        });

        revalidatePath("/challans");
        revalidatePath("/purchase-orders");
        return { success: true, data: { id: challan.id, challanNo: challan.challanNo } };
    } catch (error) {
        if (error instanceof z.ZodError) return { success: false, error: error.issues[0].message };
        if (error instanceof ChallanValidationError) return { success: false, error: error.message };
        console.error("Create Challan Error:", error);
        return { success: false, error: "Failed to create delivery challan" };
    }
}

export async function deleteChallan(id: string) {
    try {
        await prisma.deliveryChallan.delete({ where: { id } });
        revalidatePath("/challans");
        revalidatePath("/purchase-orders");
        return { success: true };
    } catch (error) {
        console.error("Delete Challan Error:", error);
        return { success: false, error: "Failed to delete delivery challan" };
    }
}
