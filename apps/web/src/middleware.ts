import { NextResponse, type NextRequest } from 'next/server';

import { REFRESH_COOKIE_NAME } from '@/lib/auth/cookies';

const PROTECTED_PREFIXES = ['/app', '/onboarding'];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
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
  matcher: ['/app/:path*', '/onboarding/:path*'],
};
