"use server";

import { prisma } from "@/lib/prisma";
import { extractDataFromPO, ExtractedPOData } from "@/lib/ai/po-extractor";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { calculateDocumentTotals } from "@/lib/finance";

class POValidationError extends Error {}

export async function processPOUpload(formData: FormData) {
    const file = formData.get("file") as File;
    if (!file) {
        return { success: false, error: "No file uploaded" };
    }

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString("base64");

        // Extract data using Gemini
        const extractedData = await extractDataFromPO(base64, file.type);

        if (!extractedData) {
            return { success: false, error: "AI Extraction Failed. Please try a clearer image." };
        }

        // Fuzzy Match Customer by name or exact match by NTN/Email
        let matchedCustomer = null;
        const customerName = extractedData.customer?.name;
        const customerEmail = extractedData.customer?.email;
        const customerNTN = extractedData.customer?.ntn;

        const conditions: Prisma.CustomerWhereInput[] = [];
        if (customerName) {
            conditions.push({ name: { contains: customerName, mode: 'insensitive' } });
            conditions.push({ nameUrdu: { contains: customerName } });
        }
        if (customerEmail) conditions.push({ email: customerEmail });
        if (customerNTN) conditions.push({ ntn: customerNTN });

        if (conditions.length > 0) {
            matchedCustomer = await prisma.customer.findFirst({
                where: { OR: conditions },
                select: {
                    id: true,
                    name: true,
                    nameUrdu: true,
                    phone: true,
                    address: true,
                    email: true,
                    ntn: true,
                    gstNumber: true
                }
            });
        }

        return {
            success: true,
            data: {
                extracted: extractedData,
                matchedCustomer
            }
        };
    } catch (error) {
        console.error("PO Processing Error:", error);
        return { success: false, error: "Failed to process file" };
    }
}

export type ConfirmPOData = Omit<Partial<ExtractedPOData>, "items" | "paymentTerms" | "notes"> & {
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
    }[];
};

export async function confirmCustomerPO(data: ConfirmPOData) {
    try {
        const safeNumber = (val: unknown) => {
            const parsed = parseFloat(String(val));
            return isNaN(parsed) ? 0 : parsed;
        };

        const lines = data.items
            .filter((item) => (item.description || "").trim() !== "")
            .map((item) => ({
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

            return tx.customerPurchaseOrder.create({
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
                        create: lines.map((line, i) => ({ ...line, amount: totals.lines[i].amount })),
                    },
                },
            });
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
