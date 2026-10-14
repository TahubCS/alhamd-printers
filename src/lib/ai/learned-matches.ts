import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeName } from "./customer-match";
import { lineKeys, suggestProduct, type DocumentLine, type ProductMatch } from "./product-match";

/** Every printed customer name staff have confirmed so far. */
export function loadCustomerAliases() {
    return prisma.customerAlias.findMany({ select: { normalizedName: true, customerId: true } });
}

/** Product suggestion for each line, using what this customer's earlier POs taught us. */
export async function suggestProducts(customerId: string | null, lines: DocumentLine[]): Promise<(ProductMatch | null)[]> {
    const [products, aliases] = await Promise.all([
        prisma.product.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true } }),
        customerId
            ? prisma.productAlias.findMany({ where: { customerId }, select: { normalizedText: true, productId: true } })
            : Promise.resolve([]),
    ]);
    return lines.map((line) => suggestProduct(line, products, aliases));
}

export interface ConfirmedLine {
    /** Product staff linked on the review screen, if any */
    productId: string | null;
    /** Product the app suggested for this line, if any */
    suggestedProductId: string | null;
    /** Text and code as the document printed them, before any edits */
    description: string;
    productCode: string | null;
}

/**
 * Remembers a confirmed reading: the printed customer name, and which product
 * each printed line turned out to be. A suggestion staff removed is forgotten
 * so the same mistake is not offered again.
 */
export async function recordConfirmedReading(
    tx: Prisma.TransactionClient,
    customerId: string,
    printedCustomerName: string | null,
    lines: ConfirmedLine[],
) {
    const printed = (printedCustomerName || "").trim();
    const normalizedName = normalizeName(printed);
    if (normalizedName) {
        const customer = await tx.customer.findUnique({ where: { id: customerId }, select: { name: true } });
        // The customer's own name already matches without help; only spellings that differ are worth keeping
        if (customer && normalizeName(customer.name) !== normalizedName) {
            await tx.customerAlias.upsert({
                where: { normalizedName },
                create: { customerId, normalizedName, name: printed },
                update: { customerId, name: printed, timesConfirmed: { increment: 1 } },
            });
        }
    }

    for (const line of lines) {
        const keys = lineKeys(line);
        if (keys.length === 0) continue;
        if (line.productId) {
            for (const normalizedText of keys) {
                await tx.productAlias.upsert({
                    where: { customerId_normalizedText: { customerId, normalizedText } },
                    create: { customerId, normalizedText, text: normalizedText.startsWith("code:") ? line.productCode ?? normalizedText : line.description, productId: line.productId },
                    update: { productId: line.productId, timesConfirmed: { increment: 1 } },
                });
            }
        } else if (line.suggestedProductId) {
            await tx.productAlias.deleteMany({ where: { customerId, normalizedText: { in: keys } } });
        }
    }
}
