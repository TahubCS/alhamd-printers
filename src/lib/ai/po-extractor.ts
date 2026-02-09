import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

export interface ExtractedPOItem {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
    gstRate?: number;
    unit?: string;
    productCode?: string;
}

export interface ExtractedCustomerData {
    name: string | null;
    nameUrdu?: string | null;
    phone?: string | null;
    fax?: string | null;
    email?: string | null;
    address?: string | null;
    website?: string | null;
    ntn?: string | null;
    gstNumber?: string | null;
}

export interface ExtractedPOData {
    poNumber: string | null;
    date: string | null;
    customer: ExtractedCustomerData;
    totalAmount: number;
    items: ExtractedPOItem[];
    paymentTerms?: string | null;
    deliveryDate?: string | null;
    notes?: string | null;
    confidence: number;
}

export async function extractDataFromPO(fileBase64: string, mimeType: string): Promise<ExtractedPOData | null> {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
        console.error("GOOGLE_GEMINI_API_KEY is missing");
        return null;
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
            You are an AI assistant for **Al-Hamd Printers** (also known as **ATS**, **M.A Enterprises**, **Muhammad Tanveer**).
            We manufacture PVC bags in **Pakistan**.
            
            **CRITICAL CONTEXT:**
            - **VENDOR/SUPPLIER**: "Al-Hamd Printers", "ATS", "M.A Enterprises", "Muhammad Tanveer", "Tanveer Polybag". This is US.
            - **CUSTOMER**: The entity SENDING this Purchase Order. Their name is usually at the **TOP HEADER** or **Logo**.
            - **DO NOT** confuse the Customer with the Vendor.
            
            **YOUR TASK:**
            Perform a deep scan of the document. Extract structured data into the JSON format below.
            
            **JSON STRUCTURE:**
            {
                "poNumber": string | null,
                "date": "YYYY-MM-DD" | null,
                "customer": {
                    "name": string | null,
                    "nameUrdu": string | null,
                    "phone": string | null,
                    "fax": string | null,
                    "email": string | null,
                    "address": string | null,
                    "website": string | null,
                    "ntn": string | null,
                    "gstNumber": string | null
                },
                "totalAmount": number,
                "items": [
                    {
                        "description": string,
                        "quantity": number,
                        "rate": number,
                        "amount": number,
                        "gstRate": number,
                        "unit": string | null,
                        "productCode": string | null
                    }
                ],
                "paymentTerms": string | null,
                "deliveryDate": "YYYY-MM-DD" | null,
                "notes": string | null,
                "confidence": number
            }

            **EXTRACTION RULES:**
            
            1. **CUSTOMER IDENTIFICATION:** 
               - The Customer Name is almost always the **LETTERHEAD TITLE** (e.g., "Tex World Bath Fashion", "FashionMart").
               - Ignore "Vendor", "Supplier", or "To" fields pointing to Al-Hamd/ATS.
               - Extract contact details (Phone, Email, Address).
               - **IMPORTANT**: Look for **"NTN"** and **"STRN" / "GST"** numbers. These are critical. Extract them into 'ntn' and 'gstNumber'.

            2. **DATE PARSING:**
               - Parse formats like **"05-Feb-2026"**, "05/02/2026", "2026-02-05".
               - Return strictly in **"YYYY-MM-DD"** format.

            3. **ITEM TABLE EXTRACTION:**
               - **Item Count Check**: Look for a "Sr. No" or "Item No" column. If it goes up to 3, ENSURE you return 3 items. Do not miss any rows.
               - **Rates**: A rate of **0.00** is VALID (e.g., for samples or client-supplied material). Do not treat it as null.
               - **GST %**: Look for columns like "GST %", "Sales Tax", "ST". Extract the percentage number (e.g., 18).
               - **Units**: Extract units like "Pieces", "KG", "Pcs".
               - **Description**: Combine Description, Size, Material, and Remarks columns into a single detailed description string.

            4. **PAYMENT TERMS**:
               - Look for "Payment Terms:", "Terms:", or phrases like "90 days".
            
            5. **TOTALS**:
               - Use the "Grand Total" or "Total" field.
               - If missing, calculate: sum(amount).
               
            6. **CONFIDENCE**:
               - Return a score (0.0 - 1.0) based on how well you could read the table and header.

            Scan HANDWRITTEN and PRINTED text. Pakistan-specific context: "NTN" (National Tax Number), "GST" (General Sales Tax).
            
            OUTPUT ONLY VALID JSON.
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: fileBase64,
                    mimeType: mimeType
                }
            }
        ]);

        const response = await result.response;
        let text = response.text();

        // Cleanup JSON
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const firstOpen = text.indexOf('{');
        const lastClose = text.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1) {
            text = text.substring(firstOpen, lastClose + 1);
        }

        const parsed = JSON.parse(text);

        // Backwards compatibility: flatten customer name if needed
        if (!parsed.customer && parsed.customerName) {
            parsed.customer = { name: parsed.customerName };
        }

        return parsed as ExtractedPOData;

    } catch (error) {
        console.error("Gemini Extraction Error:", error);
        return null;
    }
}