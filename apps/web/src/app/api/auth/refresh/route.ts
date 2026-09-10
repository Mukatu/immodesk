import { NextResponse } from 'next/server';

import { API_INTERNAL_URL } from '@/lib/api/server-config';
import { clearRefreshCookie, getRefreshCookie, setRefreshCookie } from '@/lib/auth/cookies';
import type { RefreshResponse } from '@/lib/api/types';

export async function POST() {
  const refreshToken = await getRefreshCookie();

  if (!refreshToken) {
    return NextResponse.json(
      { code: 'IAM.REFRESH_REVOKED', message: 'Session expirée, veuillez vous reconnecter.' },
      { status: 401 },
    );
  }

  const upstream = await fetch(`${API_INTERNAL_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const payload = await upstream.json().catch(() => null);

  if (!upstream.ok || !payload) {
    await clearRefreshCookie();
    return NextResponse.json(payload, { status: upstream.status });
  }

  const data = payload as RefreshResponse;
  await setRefreshCookie(data.refreshToken);

  return NextResponse.json({ accessToken: data.accessToken });
}
