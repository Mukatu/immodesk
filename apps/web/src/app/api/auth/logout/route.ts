import { NextResponse } from 'next/server';

import { API_INTERNAL_URL } from '@/lib/api/server-config';
import { clearRefreshCookie, getRefreshCookie } from '@/lib/auth/cookies';

export async function POST() {
  const refreshToken = await getRefreshCookie();

  if (refreshToken) {
    await fetch(`${API_INTERNAL_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => null);
  }

  await clearRefreshCookie();
  return new NextResponse(null, { status: 204 });
}
