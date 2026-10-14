import { countErrors, reviewReceipt, type ExtractedReceiptData, type RawReceipt } from "./extraction-checks";
import { escalationPass, firstPass, nullable, readDocument, type ReadPass } from "./gemini";

export type { ExtractedReceiptData } from "./extraction-checks";

const RECEIPT_SCHEMA = {
    type: "object",
    properties: {
        isReceipt: { type: "boolean", description: "False if this is not a receipt, bill or cash memo." },
        description: {
            type: "string",
            description: "What was paid for, in plain English, under 100 characters, e.g. \"Diesel - 50 litres\" or \"Electricity bill - September\".",
        },
        vendor: nullable({ type: "string", description: "Shop, company or person who was paid." }),
        amount: nullable({ type: "number", description: "Final amount paid (grand total / net payable) as printed." }),
        lineItemsTotal: nullable({ type: "number", description: "Sum of the printed item amounts, only if items with amounts are listed." }),
        currency: nullable({ type: "string", description: "Currency as printed; PKR for Rs or روپے." }),
        date: nullable({ type: "string", description: "Receipt date as YYYY-MM-DD." }),
        unreadable: { type: "array", items: { type: "string" }, description: "Fields you could not read with certainty." },
    },
    required: ["isReceipt", "description", "vendor", "amount", "lineItemsTotal", "currency", "date", "unreadable"],
};

const SYSTEM_INSTRUCTION = `You read expense receipts for a business in Pakistan. Receipts may be printed, handwritten, or in English, Urdu or both.

- amount is the final total paid as printed (Grand Total, Net, Total Payable). Do not use a subtotal, a tax line or the cash tendered/change.
- Copy numbers as printed: remove thousands separators and currency symbols, convert Urdu/Arabic digits to 0-9. Do not round.
- If no total is printed, return null for amount; do not add the items up yourself.
- Pakistani dates put the day first: 05/02/2026 is 5 February 2026. Return YYYY-MM-DD, or null if no date is visible.
- Write the description in English, translating Urdu, and include quantity or billing period when printed.
- When something is unclear, give your best reading and list it in unreadable.`;

async function read(pass: ReadPass, file: { base64: string; mimeType: string }) {
    const raw = await readDocument<RawReceipt>({
        task: "receipt",
        pass,
        systemInstruction: SYSTEM_INSTRUCTION,
        instruction: "Read this receipt.",
        file,
        schema: RECEIPT_SCHEMA,
    });
    return reviewReceipt(raw, pass.model, pass.strong);
}

/** Cheap model first; the stronger model only when no total could be read. */
export async function extractDataFromReceipt(fileBase64: string, mimeType: string): Promise<ExtractedReceiptData | null> {
    const file = { base64: fileBase64, mimeType };
    let first: ExtractedReceiptData | null = null;
    try {
        first = await read(firstPass(), file);
        if (countErrors(first.checks) === 0) return first;
    } catch (error) {
        console.error("Receipt extraction (first pass) failed:", error);
    }

    const strong = escalationPass();
    if (!strong) return first;
    try {
        const second = await read(strong, file);
        return !first || countErrors(second.checks) <= countErrors(first.checks) ? second : first;
    } catch (error) {
        console.error("Receipt extraction (escalation) failed:", error);
        return first;
    }
}
