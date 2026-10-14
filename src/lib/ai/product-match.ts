/*
 * Links a line on a customer's PO to one of our products. What staff confirmed
 * on earlier POs from the same customer wins; otherwise an exact product code
 * or product name is used. Anything less certain is left unlinked.
 */

export type ProductMatchReason = "learned" | "code" | "name";

export interface ProductMatch {
    productId: string;
    reason: ProductMatchReason;
}

export interface ProductCandidate {
    id: string;
    code: string;
    name: string;
}

export interface ProductAliasEntry {
    normalizedText: string;
    productId: string;
}

export interface DocumentLine {
    description: string;
    productCode?: string | null;
}

export function normalizeText(value: string | null | undefined): string {
    return (value || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/**
 * Keys a line is remembered by: the customer's own item code when printed (most
 * stable), then the description.
 */
export function lineKeys(line: DocumentLine): string[] {
    const keys: string[] = [];
    const code = normalizeText(line.productCode);
    if (code) keys.push(`code:${code}`);
    const description = normalizeText(line.description);
    if (description) keys.push(description);
    return keys;
}

function containsPhrase(text: string, phrase: string) {
    return phrase.length > 0 && ` ${text} `.includes(` ${phrase} `);
}

export function suggestProduct(
    line: DocumentLine,
    products: ProductCandidate[],
    aliases: ProductAliasEntry[] = [],
): ProductMatch | null {
    const known = new Set(products.map((p) => p.id));

    for (const key of lineKeys(line)) {
        const alias = aliases.find((a) => a.normalizedText === key);
        if (alias && known.has(alias.productId)) return { productId: alias.productId, reason: "learned" };
    }

    const code = normalizeText(line.productCode);
    const description = normalizeText(line.description);

    const byCode = products.filter((p) => {
        const ours = normalizeText(p.code);
        return ours && (ours === code || containsPhrase(description, ours));
    });
    if (byCode.length === 1) return { productId: byCode[0].id, reason: "code" };

    const exactName = products.filter((p) => normalizeText(p.name) === description);
    if (exactName.length === 1) return { productId: exactName[0].id, reason: "name" };

    // A distinctive product name inside a longer description, e.g. "Stripe White 12x18 9MM"
    // When several names fit ("Stripe White" and "Stripe White Premium"), the longest is the most specific
    const named = products
        .map((p) => ({ id: p.id, name: normalizeText(p.name) }))
        .filter((p) => p.name.length >= 6 && containsPhrase(description, p.name))
        .sort((a, b) => b.name.length - a.name.length);
    if (named.length === 1 || (named.length > 1 && named[0].name.length > named[1].name.length)) {
        return { productId: named[0].id, reason: "name" };
    }

    return null;
}
