"use server";

import { prisma } from "@/lib/prisma";
import { extractDataFromPO, ExtractedPOData } from "@/lib/ai/po-extractor";
import { matchCustomer } from "@/lib/ai/customer-match";
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
        const [companies, customers] = await Promise.all([
            prisma.company.findMany({ select: { name: true, nameUrdu: true } }),
            prisma.customer.findMany({
                select: { id: true, name: true, nameUrdu: true, phone: true, email: true, ntn: true, gstNumber: true },
            }),
        ]);
        // Our own invoicing names, so the model never mistakes us for the customer
        const vendorNames = companies.flatMap((c) => [c.name, c.nameUrdu]).filter((n): n is string => Boolean(n));

        const extractedData = await extractDataFromPO(buffer.toString("base64"), file.type, vendorNames);
        if (!extractedData) {
            return { success: false, error: "AI Extraction Failed. Please try a clearer image." };
        }

        const match = matchCustomer(extractedData.customer, customers);
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
