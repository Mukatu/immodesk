import { NextResponse } from 'next/server';

import { API_INTERNAL_URL } from '@/lib/api/server-config';
import {
  clearPortalRefreshCookie,
  getPortalRefreshCookie,
  setPortalRefreshCookie,
} from '@/lib/auth/portal-cookies';

export async function POST() {
  const refreshToken = await getPortalRefreshCookie();

  if (!refreshToken) {
    return NextResponse.json(
      { code: 'IAM.REFRESH_REVOKED', message: 'Session expirée, veuillez vous reconnecter.' },
      { status: 401 },
    );
  }

  // Même route de rafraîchissement générique que l'agence côté API mock (issueTokens
  // n'attache aucun rôle particulier au jeton) : seul le cookie et l'état client diffèrent.
  const upstream = await fetch(`${API_INTERNAL_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const payload = await upstream.json().catch(() => null);

  if (!upstream.ok || !payload) {
    await clearPortalRefreshCookie();
    return NextResponse.json(payload, { status: upstream.status });
  }

  const data = payload as { accessToken: string; refreshToken: string };
  await setPortalRefreshCookie(data.refreshToken);

  return NextResponse.json({ accessToken: data.accessToken });
}
