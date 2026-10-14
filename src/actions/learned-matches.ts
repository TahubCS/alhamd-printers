"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

/** Everything the app has learned from confirmed PO readings, for review in Settings. */
export async function getLearnedMatches() {
    try {
        const [customerAliases, productAliases] = await Promise.all([
            prisma.customerAlias.findMany({
                include: { customer: { select: { name: true } } },
                orderBy: { updatedAt: "desc" },
            }),
            prisma.productAlias.findMany({
                include: {
                    customer: { select: { name: true } },
                    product: { select: { code: true, name: true } },
                },
                orderBy: [{ customer: { name: "asc" } }, { updatedAt: "desc" }],
            }),
        ]);
        return { success: true, data: { customerAliases, productAliases } };
    } catch (error) {
        console.error("Get Learned Matches Error:", error);
        return { success: false, error: "Failed to load learned matches" };
    }
}

export async function deleteCustomerAlias(id: string) {
    try {
        await prisma.customerAlias.delete({ where: { id } });
        revalidatePath("/settings");
        return { success: true };
    } catch (error) {
        console.error("Delete Customer Alias Error:", error);
        return { success: false, error: "Failed to forget this match" };
    }
}

export async function deleteProductAlias(id: string) {
    try {
        await prisma.productAlias.delete({ where: { id } });
        revalidatePath("/settings");
        return { success: true };
    } catch (error) {
        console.error("Delete Product Alias Error:", error);
        return { success: false, error: "Failed to forget this match" };
    }
}
