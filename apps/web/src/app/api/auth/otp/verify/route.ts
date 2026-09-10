import { NextResponse } from 'next/server';

import { API_INTERNAL_URL } from '@/lib/api/server-config';
import { setRefreshCookie } from '@/lib/auth/cookies';
import type { OtpVerifyResponse } from '@/lib/api/types';

export async function POST(request: Request) {
  const body = await request.json();

  const upstream = await fetch(`${API_INTERNAL_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = await upstream.json().catch(() => null);

  if (!upstream.ok || !payload) {
    return NextResponse.json(payload, { status: upstream.status });
  }

  const data = payload as OtpVerifyResponse;
  await setRefreshCookie(data.refreshToken);

  // Le refresh token ne quitte jamais le serveur : on ne renvoie que l'access token.
  return NextResponse.json(
    {
      accessToken: data.accessToken,
      user: data.user,
      organizations: data.organizations,
    },
    { status: upstream.status },
  );
}
