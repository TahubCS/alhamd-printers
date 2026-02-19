import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

export interface ExtractedReceiptData {
    description: string;
    amount: number;
    date: string | null; // YYYY-MM-DD or null
    confidence: number;  // 0.0 - 1.0
}

export async function extractDataFromReceipt(fileBase64: string, mimeType: string): Promise<ExtractedReceiptData | null> {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
        console.error("GOOGLE_GEMINI_API_KEY is missing");
        return null;
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
            You are an AI assistant for a business in **Pakistan**. 
            You are analyzing a **receipt or bill** image to extract expense information.

            **CONTEXT:**
            - Receipts may be informal, handwritten, or printed.
            - Text may be in **English, Urdu, or a mix of both**.
            - Common expense types: fuel (petrol/diesel), utilities (bijli/gas/pani), office supplies, 
              repair/maintenance, food/chai, transport/rickshaw, courier/delivery, raw materials, 
              phone recharge, rent, labor charges.
            - Pakistani currency is PKR (Rs. / روپے).

            **YOUR TASK:**
            Extract the following from the receipt image:

            {
                "description": string,  // A clear, concise description of what was purchased/paid for (in English)
                "amount": number,       // The TOTAL amount paid (just the number, no currency symbol)
                "date": "YYYY-MM-DD" | null,  // Date on the receipt, if visible
                "confidence": number    // 0.0 to 1.0, how confident you are in the extraction
            }

            **EXTRACTION RULES:**

            1. **DESCRIPTION**: 
               - Summarize what the expense is for in plain English (e.g., "Diesel fuel - 50 liters", "Electricity bill - February", "Office stationery supplies").
               - If the receipt is in Urdu, translate the description to English.
               - Include key details like quantity or period if visible.
               - Keep it under 100 characters.

            2. **AMOUNT**: 
               - Find the TOTAL / Grand Total / final amount.
               - If multiple amounts exist, use the largest one (usually the total).
               - Return just the number (e.g., 5400, not "Rs. 5,400").
               - If handwritten, be careful with digit recognition (Pakistani handwriting style).

            3. **DATE**: 
               - Parse any date format found on the receipt.
               - Return in YYYY-MM-DD format.
               - If no date visible, return null.

            4. **CONFIDENCE**: 
               - 0.9+ : Clear, printed receipt with obvious total
               - 0.7-0.9 : Mostly readable, some guessing
               - 0.5-0.7 : Handwritten, blurry, or partially visible
               - <0.5 : Very unclear, low reliability

            OUTPUT ONLY VALID JSON. No markdown, no explanation.
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

        return parsed as ExtractedReceiptData;

    } catch (error) {
        console.error("Gemini Receipt Extraction Error:", error);
        return null;
    }
}
