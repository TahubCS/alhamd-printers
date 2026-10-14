import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
    const form = await request.formData().catch(() => null);
    const requestedLocale = String(form?.get("locale") ?? "");
    const locale = (routing.locales as readonly string[]).includes(requestedLocale)
        ? requestedLocale
        : routing.defaultLocale;

    const response = NextResponse.redirect(new URL(`/${locale}/login`, request.url), 303);
    response.cookies.delete(SESSION_COOKIE);
    return response;
}
