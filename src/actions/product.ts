"use server";

import { prisma } from "@/lib/prisma";

export async function getProducts(query?: string) {
    try {
        const products = await prisma.product.findMany({
            where: {
                isActive: true,
                OR: query ? [
                    { name: { contains: query, mode: 'insensitive' } },
                    { code: { contains: query, mode: 'insensitive' } }
                ] : undefined
            },
            orderBy: { name: 'asc' }
        });

        return { success: true, data: products };
    } catch (error) {
        console.error("Get Products Error:", error);
        return { success: false, error: "Failed to fetch products" };
    }
}
