"use server";

import { prisma } from "@/lib/prisma";
import { extractDataFromPO, ExtractedPOData } from "@/lib/ai/po-extractor";
import { matchCustomer } from "@/lib/ai/customer-match";
import { loadCustomerAliases, recordConfirmedReading, suggestProducts } from "@/lib/ai/learned-matches";
import { MAX_UPLOAD_BYTES, SUPPORTED_MIME_TYPES } from "@/lib/ai/gemini";
import { revalidatePath } from "next/cache";
import { calculateDocumentTotals } from "@/lib/finance";

class POValidationError extends Error {}

export async function processPOUpload(formData: FormData) {
    const file = formData.get("file") as File;
    if (!file) {
        return { success: false, error: "No file uploaded" };
    }
    if (!SUPPORTED_MIME_TYPES.has(file.type)) {
        return { success: false, error: "Upload a PDF or a JPEG, PNG, WebP or HEIC image" };
    }
    if (file.size > MAX_UPLOAD_BYTES) {
        return { success: false, error: "The file is larger than 14 MB" };
    }

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const [companies, customers, customerAliases] = await Promise.all([
            prisma.company.findMany({ select: { name: true, nameUrdu: true } }),
            prisma.customer.findMany({
                select: { id: true, name: true, nameUrdu: true, phone: true, email: true, ntn: true, gstNumber: true },
            }),
            loadCustomerAliases(),
        ]);
        // Our own invoicing names, so the model never mistakes us for the customer
        const vendorNames = companies.flatMap((c) => [c.name, c.nameUrdu]).filter((n): n is string => Boolean(n));

        const extractedData = await extractDataFromPO(buffer.toString("base64"), file.type, vendorNames);
        if (!extractedData) {
            return { success: false, error: "AI Extraction Failed. Please try a clearer image." };
        }

        const match = matchCustomer(extractedData.customer, customers, customerAliases);
        const suggestions = await suggestProducts(match?.id ?? null, extractedData.items);
        extractedData.items = extractedData.items.map((item, i) => ({
            ...item,
            productId: suggestions[i]?.productId ?? null,
            productMatch: suggestions[i]?.reason ?? null,
        }));
        const matchedCustomer = match
            ? await prisma.customer.findUnique({
                where: { id: match.id },
                select: { id: true, name: true, nameUrdu: true, phone: true, address: true, email: true, ntn: true, gstNumber: true },
            })
            : null;

        return {
            success: true,
            data: {
                extracted: extractedData,
                matchedCustomer,
                matchReason: match?.reason ?? null,
            }
        };
    } catch (error) {
        console.error("PO Processing Error:", error);
        return { success: false, error: "Failed to process file" };
    }
}

export type ConfirmPOData = Omit<Partial<ExtractedPOData>, "items" | "paymentTerms" | "notes" | "checks" | "model" | "escalated"> & {
    customerId?: string;
    paymentTerms?: string | null;
    notes?: string | null;
    // Customer fields for new customer creation
    newCustomerName?: string;
    newCustomerNameUrdu?: string;
    newCustomerPhone?: string;
    newCustomerEmail?: string;
    newCustomerAddress?: string;
    newCustomerNTN?: string;
    newCustomerGST?: string;
    /** Set only for AI-read POs: the customer name as printed, so confirmations can be learned */
    printedCustomerName?: string | null;
    // File Metadata
    originalFileUrl?: string | null;
    ocrText?: string | null;
    // GST Support
    items: {
        description: string;
        quantity: number;
        rate: number;
        amount?: number;
        gstRate?: number;
        unit?: string;
        customAttributes?: Record<string, string | null>;
        productId?: string | null;
        // AI-read lines only: what was suggested and what the document printed
        suggestedProductId?: string | null;
        sourceDescription?: string | null;
        sourceProductCode?: string | null;
    }[];
};

export async function confirmCustomerPO(data: ConfirmPOData) {
    try {
        const safeNumber = (val: unknown) => {
            const parsed = parseFloat(String(val));
            return isNaN(parsed) ? 0 : parsed;
        };

        const items = data.items.filter((item) => (item.description || "").trim() !== "");
        const lines = items.map((item) => ({
            description: item.description.trim(),
            quantity: Math.max(1, Math.round(safeNumber(item.quantity))),
            rate: Math.max(0, safeNumber(item.rate)),
            gstRate: Math.max(0, safeNumber(item.gstRate)),
            unit: item.unit || "Pieces",
            customAttributes: item.customAttributes || {},
        }));
        if (lines.length === 0) {
            return { success: false, error: "Add at least one item with a description" };
        }

        // Amounts are always quantity × rate so the PO matches the invoice raised from it
        const totals = calculateDocumentTotals(lines);
        const notes = [data.paymentTerms && `Payment terms: ${data.paymentTerms}`, data.notes]
            .map((part) => (part || "").trim())
            .filter(Boolean)
            .join("\n") || null;

        const po = await prisma.$transaction(async (tx) => {
            let customerId = data.customerId || undefined;

            // Create the customer from the extracted details unless one with that name exists
            if (!customerId) {
                const customerName = (data.newCustomerName || data.customer?.name || "").trim();
                if (!customerName) {
                    throw new POValidationError("Select a customer or enter the new customer's name");
                }
                const existing = await tx.customer.findFirst({
                    where: { name: { equals: customerName, mode: "insensitive" } },
                });
                if (existing) {
                    customerId = existing.id;
                } else {
                    const email = (data.newCustomerEmail || data.customer?.email || "").trim() || null;
                    if (email && await tx.customer.findUnique({ where: { email } })) {
                        throw new POValidationError(`Another customer already uses ${email}`);
                    }
                    const created = await tx.customer.create({
                        data: {
                            name: customerName,
                            nameUrdu: data.newCustomerNameUrdu || data.customer?.nameUrdu || null,
                            phone: data.newCustomerPhone || data.customer?.phone || null,
                            email,
                            address: data.newCustomerAddress || data.customer?.address || null,
                            ntn: data.newCustomerNTN || data.customer?.ntn || null,
                            gstNumber: data.newCustomerGST || data.customer?.gstNumber || null,
                        },
                    });
                    customerId = created.id;
                }
            }

            // Only link products that exist
            const requested = [...new Set(items.map((item) => item.productId).filter((id): id is string => Boolean(id)))];
            const existing = new Set((await tx.product.findMany({ where: { id: { in: requested } }, select: { id: true } })).map((p) => p.id));
            const productIds = items.map((item) => (item.productId && existing.has(item.productId) ? item.productId : null));

            const created = await tx.customerPurchaseOrder.create({
                data: {
                    customerId,
                    poNumber: data.poNumber || `PO-${Date.now()}`,
                    date: data.date ? new Date(data.date) : new Date(),
                    subtotal: totals.subtotal,
                    taxTotal: totals.taxTotal,
                    totalAmount: totals.total,
                    status: "OPEN",
                    notes,
                    originalFileUrl: data.originalFileUrl || null,
                    ocrText: data.ocrText || null,
                    items: {
                        create: lines.map((line, i) => ({ ...line, amount: totals.lines[i].amount, productId: productIds[i] })),
                    },
                },
            });

            if (data.printedCustomerName !== undefined) {
                await recordConfirmedReading(tx, customerId, data.printedCustomerName, items.map((item, i) => ({
                    productId: productIds[i],
                    suggestedProductId: item.suggestedProductId ?? null,
                    description: item.sourceDescription || item.description,
                    productCode: item.sourceProductCode ?? null,
                })));
            }
            return created;
        });

        revalidatePath("/purchase-orders");
        revalidatePath("/customers");

        return {
            success: true,
            data: {
                id: po.id,
                poNumber: po.poNumber,
                totalAmount: Number(po.totalAmount),
            }
        };
    } catch (error) {
        if (error instanceof POValidationError) {
            return { success: false, error: error.message };
        }
        console.error("Confirm PO Error:", error);
        return { success: false, error: "Failed to save the purchase order" };
    }
}
