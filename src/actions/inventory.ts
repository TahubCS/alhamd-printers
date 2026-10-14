"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { RawMaterial, InventoryTransaction } from "@prisma/client";
import { stockChange } from "@/lib/finance";

export type RawMaterialType = "ROLL" | "HANGER" | "BUTTON" | "TAPE" | "OTHER";
export type TransactionType = "IN" | "OUT" | "ADJUSTMENT";

// Serialized types for client components (Decimal -> number)
export type SerializedRawMaterial = Omit<RawMaterial, 'quantity' | 'minimumStockLevel'> & {
    quantity: number;
    minimumStockLevel: number;
};

export type SerializedTransaction = Omit<InventoryTransaction, 'quantity'> & {
    quantity: number;
    customerPurchaseOrder?: { poNumber: string | null } | null;
};

export interface CreateMaterialInput {
    name: string;
    type: RawMaterialType;
    attributes?: Record<string, string | number | null>;
    quantity: number;
    minimumStockLevel: number;
}

class InsufficientStockError extends Error {
    constructor(public available: number) {
        super("Insufficient stock");
    }
}

function serializeMaterial(material: RawMaterial): SerializedRawMaterial {
    return {
        ...material,
        quantity: Number(material.quantity),
        minimumStockLevel: Number(material.minimumStockLevel),
    };
}

export async function createRawMaterial(data: CreateMaterialInput) {
    try {
        const material = await prisma.rawMaterial.create({
            data: {
                name: data.name,
                type: data.type,
                attributes: data.attributes || {},
                quantity: data.quantity,
                minimumStockLevel: data.minimumStockLevel,
                // Log initial stock as IN transaction
                transactions: {
                    create: {
                        type: "IN",
                        quantity: data.quantity,
                        notes: "Initial Stock",
                    }
                }
            }
        });
        revalidatePath("/inventory");
        return { success: true, data: serializeMaterial(material) };
    } catch (error) {
        console.error("Create Material Error:", error);
        return { success: false, error: "Failed to create material" };
    }
}

export async function adjustStock(
    materialId: string,
    quantity: number,
    type: TransactionType,
    notes?: string,
    relatedPoId?: string
) {
    try {
        if (!Number.isFinite(quantity) || quantity === 0 || (type !== "ADJUSTMENT" && quantity < 0)) {
            return { success: false, error: "Enter a valid quantity" };
        }

        // IN adds, OUT removes, ADJUSTMENT carries its own sign
        const change = stockChange(type, quantity);

        const material = await prisma.$transaction(async (tx) => {
            const updated = await tx.rawMaterial.update({
                where: { id: materialId },
                data: {
                    quantity: { increment: change },
                    transactions: {
                        create: {
                            type,
                            quantity,
                            notes,
                            customerPurchaseOrderId: relatedPoId
                        }
                    }
                }
            });
            // Checked after the atomic increment so concurrent withdrawals can't both pass
            if (Number(updated.quantity) < 0) {
                throw new InsufficientStockError(Number(updated.quantity) - change);
            }
            return updated;
        });

        revalidatePath("/inventory");
        return { success: true, data: serializeMaterial(material) };
    } catch (error) {
        if (error instanceof InsufficientStockError) {
            return { success: false, error: `Not enough stock: only ${error.available} available` };
        }
        console.error("Adjust Stock Error:", error);
        return { success: false, error: "Failed to adjust stock" };
    }
}

export async function getRawMaterials() {
    try {
        const materials = await prisma.rawMaterial.findMany({
            orderBy: { name: 'asc' }
        });
        return { success: true, data: materials.map(serializeMaterial) };
    } catch (error) {
        console.error("Get Materials Error:", error);
        return { success: false, error: "Failed to fetch materials" };
    }
}

export async function getTransactionHistory(materialId: string) {
    try {
        const history = await prisma.inventoryTransaction.findMany({
            where: { materialId },
            orderBy: { date: 'desc' },
            include: {
                customerPurchaseOrder: {
                    select: { poNumber: true }
                }
            }
        });

        const serializedHistory: SerializedTransaction[] = history.map(tx => ({
            ...tx,
            quantity: Number(tx.quantity),
        }));

        return { success: true, data: serializedHistory };
    } catch (error) {
        console.error("Get History Error:", error);
        return { success: false, error: "Failed to fetch history" };
    }
}

// Placeholder MRP Calculation
export async function calculateMaterialRequirements(poId: string) {
    // 1. Fetch PO items
    // 2. Loop through items -> check product specs -> calculate raw materials
    // 3. Return summary of needed materials (e.g., "Need 50 rolls of 0.9mm Super Clear")

    console.log(`Calculating for PO ${poId}... Logic to be implemented.`);
    return {
        requirements: [],
        notes: "Detailed calculation logic will be implemented here based on product formulas."
    };
}
