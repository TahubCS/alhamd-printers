/*
 * Finds the existing customer a document belongs to. Tax numbers and email are
 * exact identifiers and win outright; names are compared after removing legal
 * suffixes and punctuation. If two customers tie on a weak signal the match is
 * left to the person reviewing rather than guessed.
 */

export interface CustomerCandidate {
    id: string;
    name: string;
    nameUrdu: string | null;
    phone: string | null;
    email: string | null;
    ntn: string | null;
    gstNumber: string | null;
}

export interface DocumentParty {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    ntn?: string | null;
    gstNumber?: string | null;
}

export type MatchReason = "ntn" | "gstNumber" | "email" | "name" | "phone" | "similarName";

export interface CustomerMatch {
    id: string;
    reason: MatchReason;
    score: number;
}

const LEGAL_WORDS = new Set([
    "pvt", "private", "ltd", "limited", "co", "company", "corp", "corporation",
    "inc", "llc", "smc", "the", "and", "industries", "industry", "enterprises", "enterprise",
]);

export function normalizeName(name: string | null | undefined): string {
    return (name || "")
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .split(" ")
        .filter((word) => word && !LEGAL_WORDS.has(word))
        .join(" ");
}

function digits(value: string | null | undefined) {
    return (value || "").replace(/\D/g, "");
}

/** Last 10 digits, so +92 300…, 0300… and 300… compare equal. */
function phoneKey(value: string | null | undefined) {
    const d = digits(value);
    return d.length >= 10 ? d.slice(-10) : "";
}

function tokenSimilarity(a: string, b: string) {
    const left = new Set(a.split(" ").filter(Boolean));
    const right = new Set(b.split(" ").filter(Boolean));
    if (left.size === 0 || right.size === 0) return 0;
    const shared = [...left].filter((word) => right.has(word)).length;
    return shared / new Set([...left, ...right]).size;
}

function score(party: DocumentParty, customer: CustomerCandidate): { score: number; reason: MatchReason } | null {
    const ntn = digits(party.ntn);
    if (ntn.length >= 7 && ntn === digits(customer.ntn)) return { score: 100, reason: "ntn" };
    const gst = digits(party.gstNumber);
    if (gst.length >= 7 && gst === digits(customer.gstNumber)) return { score: 95, reason: "gstNumber" };
    const email = (party.email || "").trim().toLowerCase();
    if (email && email === (customer.email || "").trim().toLowerCase()) return { score: 90, reason: "email" };

    const name = normalizeName(party.name);
    const names = [normalizeName(customer.name), normalizeName(customer.nameUrdu)].filter(Boolean);
    if (name && names.includes(name)) return { score: 85, reason: "name" };

    const phone = phoneKey(party.phone);
    if (phone && phone === phoneKey(customer.phone)) return { score: 70, reason: "phone" };

    if (name.length >= 4) {
        const best = Math.max(...names.map((candidate) => {
            if (candidate.length >= 4 && (candidate.includes(name) || name.includes(candidate))) return 0.8;
            return tokenSimilarity(name, candidate);
        }), 0);
        if (best >= 0.75) return { score: Math.round(best * 75), reason: "similarName" };
    }
    return null;
}

export function matchCustomer(party: DocumentParty, customers: CustomerCandidate[]): CustomerMatch | null {
    const ranked = customers
        .map((customer) => ({ customer, result: score(party, customer) }))
        .filter((entry): entry is { customer: CustomerCandidate; result: { score: number; reason: MatchReason } } => entry.result !== null)
        .sort((a, b) => b.result.score - a.result.score);

    if (ranked.length === 0) return null;
    const [best, second] = ranked;
    // Two customers equally likely on a name or phone alone: don't pick one
    if (second && second.result.score === best.result.score && best.result.score < 90) return null;
    return { id: best.customer.id, reason: best.result.reason, score: best.result.score };
}
