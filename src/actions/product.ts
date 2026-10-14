"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const optionalText = z.string().trim().optional().transform((value) => value || null);

const ProductSchema = z.object({
    code: z.string().trim().min(1, "Product code is required").transform((value) => value.toUpperCase()),
    name: z.string().trim().min(1, "Product name is required"),
    nameUrdu: optionalText,
    description: optionalText,
    thickness: optionalText,
    withTape: z.boolean().default(false),
    withPrint: z.boolean().default(false),
    basePrice: z.coerce.number().min(0, "Price cannot be negative"),
    buttonPrice: z.coerce.number().min(0, "Price cannot be negative").default(0),
});

export type ProductInput = z.input<typeof ProductSchema>;

type ProductRecord = Prisma.ProductGetPayload<object>;

function serializeProduct(product: ProductRecord) {
    return {
        ...product,
        basePrice: Number(product.basePrice),
        buttonPrice: Number(product.buttonPrice),
    };
}

export type SerializedProduct = ReturnType<typeof serializeProduct>;

/** Active products for invoice and PO line pickers. */
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

        return { success: true, data: products.map(serializeProduct) };
    } catch (error) {
        console.error("Get Products Error:", error);
        return { success: false, error: "Failed to fetch products" };
    }
}

/** Full catalog including archived products, with usage counts. */
export async function getProductCatalog() {
    try {
        const products = await prisma.product.findMany({
            orderBy: [{ isActive: "desc" }, { code: "asc" }],
            include: { _count: { select: { invoiceItems: true, purchaseOrderItems: true } } },
        });
        return {
            success: true,
            data: products.map((p) => ({
                ...serializeProduct(p),
                usageCount: p._count.invoiceItems + p._count.purchaseOrderItems,
            })),
        };
    } catch (error) {
        console.error("Get Product Catalog Error:", error);
        return { success: false, error: "Failed to fetch products", data: [] };
    }
}

export async function getProductById(id: string) {
    try {
        const product = await prisma.product.findUnique({ where: { id } });
        if (!product) return { success: false, error: "Product not found" };
        return { success: true, data: serializeProduct(product) };
    } catch (error) {
        console.error("Get Product Error:", error);
        return { success: false, error: "Failed to fetch product" };
    }
}

export async function saveProduct(id: string | null, input: ProductInput) {
    try {
        const data = ProductSchema.parse(input);

        const duplicate = await prisma.product.findFirst({
            where: { code: data.code, ...(id && { NOT: { id } }) },
        });
        if (duplicate) {
            return { success: false, error: `Product code ${data.code} is already used by "${duplicate.name}"` };
        }

        const product = id
            ? await prisma.product.update({ where: { id }, data })
            : await prisma.product.create({ data });

        revalidatePath("/products");
        return { success: true, data: { id: product.id } };
    } catch (error) {
        console.error("Save Product Error:", error);
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0].message };
        }
        return { success: false, error: "Failed to save product" };
    }
}

/** Products are archived rather than deleted so past invoices keep their references. */
export async function setProductActive(id: string, isActive: boolean) {
    try {
        await prisma.product.update({ where: { id }, data: { isActive } });
        revalidatePath("/products");
        return { success: true };
    } catch (error) {
        console.error("Update Product Error:", error);
        return { success: false, error: "Failed to update product" };
    }
}
