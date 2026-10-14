import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { credentialsMatch } from "@/lib/auth/credentials";
import {
    createSessionToken,
    getAuthSecret,
    safeRedirectPath,
    SESSION_COOKIE,
    SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";

// Best-effort brute-force throttle. It is per server instance, which is
// enough to slow down casual guessing on a small deployment.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
const failures = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: NextRequest) {
    return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}

function isThrottled(key: string, now: number) {
    const entry = failures.get(key);
    if (!entry || entry.resetAt < now) return false;
    return entry.count >= MAX_FAILURES;
}

function recordFailure(key: string, now: number) {
    const entry = failures.get(key);
    if (!entry || entry.resetAt < now) {
        failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
    } else {
        entry.count += 1;
    }
}

export async function POST(request: NextRequest) {
    const form = await request.formData();
    const username = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const requestedLocale = String(form.get("locale") ?? "");
    const locale = (routing.locales as readonly string[]).includes(requestedLocale)
        ? requestedLocale
        : routing.defaultLocale;
    const next = safeRedirectPath(String(form.get("next") ?? ""), `/${locale}`);

    const loginUrl = (error: string) => {
        const url = new URL(`/${locale}/login`, request.url);
        url.searchParams.set("error", error);
        if (next !== `/${locale}`) url.searchParams.set("next", next);
        return NextResponse.redirect(url, 303);
    };

    const secret = getAuthSecret();
    if (!secret) return loginUrl("config");

    const key = clientKey(request);
    const now = Date.now();
    if (isThrottled(key, now)) return loginUrl("throttled");

    if (!credentialsMatch(username, password)) {
        recordFailure(key, now);
        return loginUrl("invalid");
    }
    failures.delete(key);

    const response = NextResponse.redirect(new URL(next, request.url), 303);
    response.cookies.set(SESSION_COOKIE, await createSessionToken(username, secret), {
        httpOnly: true,
        // Follow the request protocol: Vercel serves HTTPS, while the client's
        // local install may be opened over plain HTTP on the office network
        secure: request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
}
