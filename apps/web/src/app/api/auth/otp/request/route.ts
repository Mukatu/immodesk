import { NextResponse } from 'next/server';

import { API_INTERNAL_URL } from '@/lib/api/server-config';

export async function POST(request: Request) {
  const body = await request.json();

  const upstream = await fetch(`${API_INTERNAL_URL}/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = await upstream.json().catch(() => null);
  return NextResponse.json(payload, { status: upstream.status });
}
