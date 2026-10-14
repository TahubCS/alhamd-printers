import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { getAuthSecret, SESSION_COOKIE, verifySessionToken } from './lib/auth/session';

const intlMiddleware = createMiddleware(routing);

const PUBLIC_PATHS = ['/login'];

/** Split "/ur/customers/1" into its locale and the path after it. */
function splitLocale(pathname: string) {
    const [, first, ...rest] = pathname.split('/');
    if ((routing.locales as readonly string[]).includes(first)) {
        return { locale: first, path: `/${rest.join('/')}` };
    }
    return { locale: null, path: pathname };
}

export default async function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
    const { locale, path } = splitLocale(pathname);
    const isPublic = PUBLIC_PATHS.includes(path.replace(/\/$/, '') || '/');

    const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, getAuthSecret());

    if (!session) {
        // Server actions can be invoked against any route, including the public
        // login page, so refuse every action call that lacks a valid session.
        if (request.headers.has('next-action')) {
            return new NextResponse('Unauthorized', { status: 401 });
        }
        if (!isPublic) {
            const targetLocale = locale ?? routing.defaultLocale;
            const loginUrl = new URL(`/${targetLocale}/login`, request.url);
            if (locale && path !== '/') loginUrl.searchParams.set('next', `${pathname}${search}`);
            return NextResponse.redirect(loginUrl);
        }
    } else if (isPublic && locale) {
        return NextResponse.redirect(new URL(`/${locale}`, request.url));
    }

    return intlMiddleware(request);
}

export const config = {
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    matcher: ['/', '/(en|ur)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};
