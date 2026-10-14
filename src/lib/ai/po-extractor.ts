import { countErrors, reviewPO, type ExtractedPOData, type RawPO } from "./extraction-checks";
import { escalationPass, firstPass, nullable, readDocument, type ReadPass } from "./gemini";

export type { ExtractedPOData, ExtractedPOItem } from "./extraction-checks";

const text = { type: "string" };
const number = { type: "number" };

const PO_SCHEMA = {
    type: "object",
    properties: {
        documentType: {
            type: "string",
            enum: ["purchase_order", "quotation", "invoice", "delivery_note", "other"],
            description: "What kind of document this is.",
        },
        poNumber: nullable({ ...text, description: "PO / order number exactly as printed." }),
        date: nullable({ ...text, description: "PO date as YYYY-MM-DD." }),
        customer: {
            type: "object",
            description: "The business that issued this PO (the buyer), never the supplier.",
            properties: {
                name: nullable(text),
                nameUrdu: nullable({ ...text, description: "Only if the name is printed in Urdu script." }),
                phone: nullable(text),
                email: nullable(text),
                address: nullable(text),
                ntn: nullable({ ...text, description: "National Tax Number of the buyer." }),
                gstNumber: nullable({ ...text, description: "STRN / sales tax registration number of the buyer." }),
            },
            required: ["name", "nameUrdu", "phone", "email", "address", "ntn", "gstNumber"],
        },
        extraColumns: {
            type: "array",
            items: text,
            description: "Headers of item-table columns other than serial, description/item, code, quantity, unit, rate, GST/tax and amount, exactly as printed.",
        },
        items: {
            type: "array",
            description: "One entry per printed item row, top to bottom.",
            items: {
                type: "object",
                properties: {
                    description: text,
                    productCode: nullable({ ...text, description: "Item/article code if the table has one." }),
                    quantity: number,
                    unit: nullable(text),
                    rate: { ...number, description: "Unit price. 0 when printed as 0." },
                    gstRate: nullable({ ...number, description: "GST / sales tax percent for this line, e.g. 18." }),
                    amount: nullable({ ...number, description: "Line amount as printed; null if the cell is empty." }),
                    extraValues: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: { column: text, value: nullable(text) },
                            required: ["column", "value"],
                        },
                    },
                },
                required: ["description", "productCode", "quantity", "unit", "rate", "gstRate", "amount", "extraValues"],
            },
        },
        lastSerialNumber: nullable({ ...number, description: "Highest Sr. No / item number printed in the table." }),
        printedTaxTotal: nullable({ ...number, description: "Total GST / sales tax as printed." }),
        printedGrandTotal: nullable({ ...number, description: "Grand total / net payable as printed." }),
        paymentTerms: nullable(text),
        deliveryDate: nullable({ ...text, description: "YYYY-MM-DD" }),
        notes: nullable({ ...text, description: "Special instructions printed on the PO." }),
        unreadable: {
            type: "array",
            items: text,
            description: "Fields or cells you could not read with certainty, e.g. \"line 3 quantity\".",
        },
    },
    required: [
        "documentType", "poNumber", "date", "customer", "extraColumns", "items", "lastSerialNumber",
        "printedTaxTotal", "printedGrandTotal", "paymentTerms", "deliveryDate", "notes", "unreadable",
    ],
};

function systemInstruction(vendorNames: string[]) {
    const us = vendorNames.length > 0 ? vendorNames.map((n) => `"${n}"`).join(", ") : "the supplier";
    return `You transcribe customer purchase orders for a PVC packaging manufacturer in Pakistan.
The supplier receiving these orders is us: ${us}. The customer is the business that issued the document.

Transcribe; do not interpret. Accuracy matters more than completeness.

Customer
- The customer is the issuer: usually the letterhead, logo or header at the top. Fields labelled "To", "Vendor" or "Supplier" that name us are not the customer.
- Copy names, numbers and codes exactly as printed. NTN and STRN/GST numbers matter most; copy every digit and dash.

Items
- Return one item per printed row of the item table, in order. Do not merge, split, reorder or skip rows, and never invent rows.
- A description that wraps onto several lines belongs to one row.
- Subtotal, tax, discount, freight and total rows are not items.
- Copy numbers as printed: remove thousands separators and currency symbols, convert Urdu/Arabic digits to 0-9. A printed rate or amount of 0 is 0.
- If a cell is empty or cut off, return null for amount/gstRate/unit/code. Never calculate a missing value from other cells.
- gstRate is the percent for that line (18 for "18%"). Use the column, or a single rate printed for the whole order. null if no GST appears anywhere.
- Columns such as Size, Brand, Colour, Gauge, Micron, Remarks go in extraColumns (header text exactly as printed) and each row's extraValues, one entry per extra column, value null when the cell is empty.

Dates
- Pakistani documents write day before month: 05/02/2026 is 5 February 2026. Return YYYY-MM-DD.

Totals
- printedGrandTotal and printedTaxTotal are what the document prints, not your own sums. null if not printed.
- lastSerialNumber is the last serial number in the table, so missing rows can be detected.

When something is unclear (handwriting, blur, stamps over text), give your best reading and list it in unreadable.`;
}

async function read(pass: ReadPass, file: { base64: string; mimeType: string }, vendorNames: string[]) {
    const raw = await readDocument<RawPO>({
        task: "purchase-order",
        pass,
        systemInstruction: systemInstruction(vendorNames),
        instruction: "Transcribe this purchase order.",
        file,
        schema: PO_SCHEMA,
    });
    return reviewPO(raw, pass.model, pass.strong);
}

/**
 * Reads a PO with the cheap model; if the arithmetic or row-count checks fail,
 * reads it once more with the stronger model and keeps whichever reading has
 * fewer errors. Returns null when no reading could be produced.
 */
export async function extractDataFromPO(fileBase64: string, mimeType: string, vendorNames: string[] = []): Promise<ExtractedPOData | null> {
    const file = { base64: fileBase64, mimeType };
    let first: ExtractedPOData | null = null;
    try {
        first = await read(firstPass(), file, vendorNames);
        if (countErrors(first.checks) === 0) return first;
    } catch (error) {
        console.error("PO extraction (first pass) failed:", error);
    }

    const strong = escalationPass();
    if (!strong) return first;
    try {
        const second = await read(strong, file, vendorNames);
        return !first || countErrors(second.checks) <= countErrors(first.checks) ? second : first;
    } catch (error) {
        console.error("PO extraction (escalation) failed:", error);
        return first;
    }
}
