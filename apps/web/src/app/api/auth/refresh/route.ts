import { createHash } from 'node:crypto';

import { NextResponse } from 'next/server';

import { singleFlightRefresh } from '@/lib/auth/refresh-singleflight';
import { API_INTERNAL_URL } from '@/lib/api/server-config';
import { clearRefreshCookie, getRefreshCookie, setRefreshCookie } from '@/lib/auth/cookies';

export async function POST() {
  const refreshToken = await getRefreshCookie();

  if (!refreshToken) {
    return NextResponse.json(
      { code: 'IAM.REFRESH_REVOKED', message: 'Session expirée, veuillez vous reconnecter.' },
      { status: 401 },
    );
  }

  // Un seul appel amont par cookie : les requêtes concurrentes partagent le même résultat.
  const result = await singleFlightRefresh(
    createHash('sha256').update(refreshToken).digest('hex'),
    async () => {
      const upstream = await fetch(`${API_INTERNAL_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const payload = await upstream.json().catch(() => null);
      return { ok: upstream.ok && Boolean(payload), status: upstream.status, payload };
    },
  );

  if (!result.ok) {
    await clearRefreshCookie();
    return NextResponse.json(result.payload, { status: result.status });
  }

  const data = result.payload as { accessToken: string; refreshToken: string };
  await setRefreshCookie(data.refreshToken);

  return NextResponse.json({ accessToken: data.accessToken });
}
