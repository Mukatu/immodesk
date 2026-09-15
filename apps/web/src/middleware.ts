import { NextResponse, type NextRequest } from 'next/server';

import { REFRESH_COOKIE_NAME } from '@/lib/auth/cookies';
import { PORTAL_REFRESH_COOKIE_NAME } from '@/lib/auth/portal-cookies';

const PROTECTED_PREFIXES = ['/app', '/onboarding'];
/** `/portail/activer` reste public : c'est le point d'entrée avant toute session portail. */
const PORTAL_PUBLIC_PREFIX = '/portail/activer';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    pathname === '/portail' ||
    (pathname.startsWith('/portail/') && !pathname.startsWith(PORTAL_PUBLIC_PREFIX))
  ) {
    const hasPortalSession = Boolean(request.cookies.get(PORTAL_REFRESH_COOKIE_NAME)?.value);
    if (!hasPortalSession) {
      const activateUrl = new URL('/portail/activer', request.url);
      return NextResponse.redirect(activateUrl);
    }
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get(REFRESH_COOKIE_NAME)?.value);

  if (!hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/onboarding/:path*', '/portail/:path*', '/portail'],
};
