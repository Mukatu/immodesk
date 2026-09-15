import { NextResponse } from 'next/server';

import { clearPortalRefreshCookie } from '@/lib/auth/portal-cookies';

export async function POST() {
  await clearPortalRefreshCookie();
  return new NextResponse(null, { status: 204 });
}
