import { describe, expect, it } from "vitest";
import { createSessionToken, safeRedirectPath, SESSION_MAX_AGE_SECONDS, verifySessionToken } from "@/lib/auth/session";

const secret = "test-secret-test-secret-test-secret-123";

describe("session tokens", () => {
    it("round-trips a signed session", async () => {
        const now = Date.UTC(2026, 0, 1);
        const token = await createSessionToken("admin", secret, now);
        const session = await verifySessionToken(token, secret, now + 1000);
        expect(session?.username).toBe("admin");
        expect(session?.expiresAt).toBe(now + SESSION_MAX_AGE_SECONDS * 1000);
    });

    it("rejects a token signed with another secret", async () => {
        const token = await createSessionToken("admin", secret);
        expect(await verifySessionToken(token, "another-secret-another-secret-12345")).toBeNull();
    });

    it("rejects a tampered payload", async () => {
        const token = await createSessionToken("staff", secret);
        const [, signature] = token.split(".");
        const forgedBody = Buffer.from(JSON.stringify({ username: "admin", expiresAt: Date.now() + 1e9 }))
            .toString("base64url");
        expect(await verifySessionToken(`${forgedBody}.${signature}`, secret)).toBeNull();
    });

    it("rejects expired, malformed and missing tokens", async () => {
        const now = Date.now();
        const token = await createSessionToken("admin", secret, now);
        expect(await verifySessionToken(token, secret, now + SESSION_MAX_AGE_SECONDS * 1000 + 1)).toBeNull();
        expect(await verifySessionToken("not-a-token", secret)).toBeNull();
        expect(await verifySessionToken(`${token}.extra`, secret)).toBeNull();
        expect(await verifySessionToken(undefined, secret)).toBeNull();
        expect(await verifySessionToken(token, null)).toBeNull();
    });
});

describe("safeRedirectPath", () => {
    it("keeps same-site paths and rejects open redirects", () => {
        expect(safeRedirectPath("/en/invoices?status=PAID", "/en")).toBe("/en/invoices?status=PAID");
        expect(safeRedirectPath("//evil.example", "/en")).toBe("/en");
        expect(safeRedirectPath("/\\evil.example", "/en")).toBe("/en");
        expect(safeRedirectPath("https://evil.example", "/en")).toBe("/en");
        expect(safeRedirectPath(undefined, "/ur")).toBe("/ur");
    });
});
