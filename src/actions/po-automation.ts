
"use server";

import { prisma } from "@/lib/prisma";
import { extractDataFromPO, ExtractedPOData } from "@/lib/ai/po-extractor";
import { revalidatePath } from "next/cache";

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

        const whereClause: any = { OR: [] };
        if (customerName) {
            whereClause.OR.push({ name: { contains: customerName, mode: 'insensitive' } });
            whereClause.OR.push({ nameUrdu: { contains: customerName } });
        }
        if (customerEmail) whereClause.OR.push({ email: customerEmail });
        if (customerNTN) whereClause.OR.push({ ntn: customerNTN });

        if (whereClause.OR.length > 0) {
            matchedCustomer = await prisma.customer.findFirst({
                where: whereClause,
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

export type ConfirmPOData = ExtractedPOData & {
    customerId?: string;
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
        amount: number;
        gstRate?: number;
        unit?: string;
        customAttributes?: Record<string, string | null>;
    }[];
};

export async function confirmCustomerPO(data: ConfirmPOData) {
    try {
        let customerId = data.customerId;

        // 1. Create New Customer if needed with ALL extracted data
        if (!customerId && (data.newCustomerName || data.customer?.name)) {
            const customerName = data.newCustomerName || data.customer?.name || "Unknown Customer";

            // Check if a customer with this name already exists
            const existingCustomer = await prisma.customer.findFirst({
                where: { name: { equals: customerName, mode: "insensitive" } },
            });

            if (existingCustomer) {
                customerId = existingCustomer.id;
            } else {
                const customerData = {
                    name: customerName,
                    nameUrdu: data.newCustomerNameUrdu || data.customer?.nameUrdu || null,
                    phone: data.newCustomerPhone || data.customer?.phone || null,
                    email: data.newCustomerEmail || data.customer?.email || `auto-${Date.now()}@placeholder.com`,
                    address: data.newCustomerAddress || data.customer?.address || null,
                    ntn: data.newCustomerNTN || data.customer?.ntn || null,
                    gstNumber: data.newCustomerGST || data.customer?.gstNumber || null,
                };

                const newCustomer = await prisma.customer.create({
                    data: customerData
                });
                customerId = newCustomer.id;
            }
        }

        if (!customerId) {
            return { success: false, error: "Customer matching failed. Please select or create a customer." };
        }

        // 2. Create Purchase Order
        const safeNumber = (val: any) => isNaN(parseFloat(val)) ? 0 : parseFloat(val);

        // Calculate totals
        let subtotal = 0;
        let taxTotal = 0;

        const itemsData = data.items.map((item: any) => {
            const quantity = Math.max(1, Math.round(safeNumber(item.quantity)));
            const rate = safeNumber(item.rate);
            const amount = safeNumber(item.amount); // Usually qty * rate, but trusting UI/Extraction
            const gstRate = safeNumber(item.gstRate || 0);

            subtotal += amount;
            taxTotal += (amount * gstRate / 100);

            return {
                description: item.description || "Item",
                quantity,
                rate,
                amount,
                gstRate,
                unit: item.unit || "Pieces",
                customAttributes: item.customAttributes || {}
            };
        });

        // Use calculated total if available, else extraction (though UI should sync them)
        // Actually, let's trust the calculated total from items if items exist
        const total = subtotal + taxTotal;

        const po = await prisma.customerPurchaseOrder.create({
            data: {
                customerId,
                poNumber: data.poNumber || `PO-${Date.now()}`,
                date: data.date ? new Date(data.date) : new Date(),
                subtotal: subtotal,
                taxTotal: taxTotal,
                totalAmount: total, // or data.totalAmount if we want to allow override? Let's use calculated.
                status: "OPEN",
                originalFileUrl: data.originalFileUrl || null,
                ocrText: data.ocrText || null,
                items: {
                    create: itemsData
                }
            }
        });

        revalidatePath("/purchase-orders");
        revalidatePath("/customers");

        // Convert Decimal to Number for client serialization
        return {
            success: true,
            data: {
                ...po,
                totalAmount: Number(po.totalAmount),
                subtotal: Number(po.subtotal), // Add this if needed by client
                taxTotal: Number(po.taxTotal), // Add this if needed by client
                date: po.date.toISOString()
            }
        };

    } catch (error) {
        console.error("Confirm PO Error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, error: `Failed to save PO: ${errorMessage}` };
    }
}
