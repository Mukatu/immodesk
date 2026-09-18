import { NextResponse, type NextRequest } from 'next/server';

import { REFRESH_COOKIE_NAME } from '@/lib/auth/cookies';
import { PORTAL_REFRESH_COOKIE_NAME } from '@/lib/auth/portal-cookies';
import {
  TENANT_PORTAL_LOGIN_PATH,
  TENANT_PORTAL_SESSION_FLAG_COOKIE,
} from '@/app/locataire/_lib/tenant-portal-cookie';

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

  // Portail locataire : session OTP sans cookie serveur (voir tenant-auth-context.tsx).
  // Le middleware ne peut donc pas lire l'access token — il lit uniquement le
  // drapeau non sensible posé côté client (voir tenant-portal-cookie.ts).
  if (
    pathname === '/locataire' ||
    (pathname.startsWith('/locataire/') && pathname !== TENANT_PORTAL_LOGIN_PATH)
  ) {
    const hasTenantSession = Boolean(request.cookies.get(TENANT_PORTAL_SESSION_FLAG_COOKIE)?.value);
    if (!hasTenantSession) {
      const loginUrl = new URL(TENANT_PORTAL_LOGIN_PATH, request.url);
      return NextResponse.redirect(loginUrl);
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
  matcher: [
    '/app/:path*',
    '/onboarding/:path*',
    '/portail/:path*',
    '/portail',
    '/locataire/:path*',
    '/locataire',
  ],
};
