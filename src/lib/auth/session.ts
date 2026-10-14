// Signed session cookies using Web Crypto HMAC-SHA256.
// Works in the proxy, route handlers and server components alike.

export const SESSION_COOKIE = "alhamd_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

const DEV_FALLBACK_SECRET = "development-only-secret-change-me-0000000000";

export interface Session {
    username: string;
    expiresAt: number; // epoch milliseconds
}

/** Returns the signing secret, or null when auth is misconfigured in production. */
export function getAuthSecret(): string | null {
    const secret = process.env.AUTH_SECRET;
    if (secret && secret.length >= 32) return secret;
    if (process.env.NODE_ENV === "production") return null;
    return DEV_FALLBACK_SECRET;
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(base64);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmacKey(secret: string) {
    return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
        "sign",
        "verify",
    ]);
}

export async function createSessionToken(username: string, secret: string, now = Date.now()): Promise<string> {
    const payload: Session = { username, expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000 };
    const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
    const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(body));
    return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(
    token: string | undefined,
    secret: string | null,
    now = Date.now()
): Promise<Session | null> {
    if (!token || !secret) return null;
    const [body, signature, extra] = token.split(".");
    if (!body || !signature || extra !== undefined) return null;

    try {
        // crypto.subtle.verify compares in constant time
        const valid = await crypto.subtle.verify(
            "HMAC",
            await hmacKey(secret),
            fromBase64Url(signature) as BufferSource,
            encoder.encode(body)
        );
        if (!valid) return null;

        const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as Partial<Session>;
        if (typeof payload.username !== "string" || typeof payload.expiresAt !== "number") return null;
        if (payload.expiresAt <= now) return null;
        return { username: payload.username, expiresAt: payload.expiresAt };
    } catch {
        return null;
    }
}

/** Only allow same-site relative redirects after login (blocks //evil.com and absolute URLs). */
export function safeRedirectPath(value: string | null | undefined, fallback: string): string {
    if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
        return fallback;
    }
    return value;
}
