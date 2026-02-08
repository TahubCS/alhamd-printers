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

        const serializedProducts = products.map(product => ({
            ...product,
            basePrice: Number(product.basePrice),
            buttonPrice: product.buttonPrice ? Number(product.buttonPrice) : null,
        }));

        return { success: true, data: serializedProducts };
    } catch (error) {
        console.error("Get Products Error:", error);
        return { success: false, error: "Failed to fetch products" };
    }
}
