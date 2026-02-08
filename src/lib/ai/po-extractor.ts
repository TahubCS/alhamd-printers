import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

export interface ExtractedPOItem {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
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
            You are an AI assistant for Al-Hamd Printers, a PVC bag manufacturing company in Pakistan.
            
            **CRITICAL BUSINESS CONTEXT:**
            - Al-Hamd Printers, ATS, M.A Enterprises, Muhammad Tanveer = OUR company names (we are the manufacturer/contractor)
            - We RECEIVE Purchase Orders FROM customers who want to buy PVC bags from us
            - The CUSTOMER is the company on the LETTERHEAD (top of the document) - they are SENDING the PO to us
            - The "CONTRACTOR" or "TO" field usually mentions us (Al-Hamd, etc.) - this is NOT the customer
            
            **PERFORM A DEEP SCAN OF THE ENTIRE DOCUMENT. Extract EVERYTHING visible.**
            
            Return this JSON structure (extract ALL available fields):
            
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
                    "website": string | null
                },
                "totalAmount": number,
                "items": [
                    {
                        "description": string,
                        "quantity": number,
                        "rate": number,
                        "amount": number,
                        "productCode": string | null
                    }
                ],
                "paymentTerms": string | null,
                "deliveryDate": "YYYY-MM-DD" | null,
                "notes": string | null,
                "confidence": number
            }

            **EXTRACTION RULES:**
            
            1. **CUSTOMER (from LETTERHEAD/HEADER):**
               - name: Company name on the letterhead (e.g., "TEXWORLD BATH FASHION", "FashionMart")
               - phone: Look for "Tel:", "Phone:", phone numbers (format: keep as-is with country codes)
               - fax: Look for "Fax:" numbers
               - email: Look for "E-mail:", "Email:" addresses
               - address: Full address from letterhead (sector, area, city, country)
               - website: Look for "Web:", "www." URLs
               
            2. **PO NUMBER:** Look for "P.O.", "PO No.", "Contract No.", "Order No.", "Sr. #"
            
            3. **DATE:** Convert any format to "YYYY-MM-DD"
            
            4. **ITEMS:** Extract ALL line items. For PVC bags look for:
               - Sizes (e.g., "29x35.50x9 cm")
               - Material specs (e.g., "9mm Blue SHADE", "with TAP", "without print")
               - Quantities (often in pieces: "19150 Pcs")
               - Rates and amounts
               
            5. **PAYMENT TERMS:** Look for "Payment will be made in X days" or similar
            
            6. **NOTES:** Extract any special instructions like "Kindly make samples for approval"
            
            7. **TOTAL:** Calculate sum of item amounts, or extract if stated
            
            8. **CONFIDENCE:** 0.0 to 1.0 based on legibility and completeness
            
            The document may be HANDWRITTEN. Scan every corner carefully.
            
            OUTPUT only VALID JSON. No markdown code blocks.
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