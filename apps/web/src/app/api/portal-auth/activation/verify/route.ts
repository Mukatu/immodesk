import { NextResponse } from 'next/server';

import { API_INTERNAL_URL } from '@/lib/api/server-config';
import { setPortalRefreshCookie } from '@/lib/auth/portal-cookies';
import type { PortalActivationVerifyResponse } from '@/lib/api/types';

export async function POST(request: Request) {
  const body = await request.json();

  const upstream = await fetch(`${API_INTERNAL_URL}/portal/activation/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = await upstream.json().catch(() => null);

  if (!upstream.ok || !payload) {
    return NextResponse.json(payload, { status: upstream.status });
  }

  const data = payload as PortalActivationVerifyResponse;
  await setPortalRefreshCookie(data.refreshToken);

  // Le refresh token du portail ne quitte jamais le serveur, comme pour l'agence.
  return NextResponse.json(
    { accessToken: data.accessToken, landlord: data.landlord, organizations: data.organizations },
    { status: upstream.status },
  );
}
