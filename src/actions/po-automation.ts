
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

        // Fuzzy Match Customer by name
        let matchedCustomer = null;
        const customerName = extractedData.customer?.name;
        if (customerName) {
            matchedCustomer = await prisma.customer.findFirst({
                where: {
                    OR: [
                        { name: { contains: customerName, mode: 'insensitive' } },
                        { nameUrdu: { contains: customerName } }
                    ]
                },
                select: { id: true, name: true, nameUrdu: true, phone: true, address: true, email: true }
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
};

export async function confirmCustomerPO(data: ConfirmPOData) {
    try {
        let customerId = data.customerId;

        // 1. Create New Customer if needed with ALL extracted data
        if (!customerId && (data.newCustomerName || data.customer?.name)) {
            const customerData = {
                name: data.newCustomerName || data.customer?.name || "Unknown Customer",
                nameUrdu: data.newCustomerNameUrdu || data.customer?.nameUrdu || null,
                phone: data.newCustomerPhone || data.customer?.phone || null,
                email: data.newCustomerEmail || data.customer?.email || `auto-${Date.now()}@placeholder.com`,
                address: data.newCustomerAddress || data.customer?.address || null,
            };

            const newCustomer = await prisma.customer.create({
                data: customerData
            });
            customerId = newCustomer.id;
        }

        if (!customerId) {
            return { success: false, error: "Customer matching failed. Please select or create a customer." };
        }

        // 2. Create Purchase Order
        const safeNumber = (val: any) => isNaN(parseFloat(val)) ? 0 : parseFloat(val);

        const po = await prisma.customerPurchaseOrder.create({
            data: {
                customerId,
                poNumber: data.poNumber || `PO-${Date.now()}`,
                date: data.date ? new Date(data.date) : new Date(),
                totalAmount: safeNumber(data.totalAmount),
                status: "OPEN",
                items: {
                    create: data.items.map((item: any) => ({
                        description: item.description || "Item",
                        quantity: Math.max(1, Math.round(safeNumber(item.quantity))),
                        rate: safeNumber(item.rate),
                        amount: safeNumber(item.amount)
                    }))
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
                date: po.date.toISOString()
            }
        };

    } catch (error) {
        console.error("Confirm PO Error:", error);
        return { success: false, error: "Failed to save PO. Detailed error in logs." };
    }
}
