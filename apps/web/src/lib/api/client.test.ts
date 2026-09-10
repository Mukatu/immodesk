import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiFetch, ApiError } from '@/lib/api/client';
import { resetTokenStore, setAccessToken } from '@/lib/api/token-store';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiFetch', () => {
  beforeEach(() => {
    resetTokenStore();
    setAccessToken('expired-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    resetTokenStore();
  });

  it('injecte Authorization et X-Organization-Id', async () => {
    setAccessToken('valid-token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/me', { organizationId: 'org-1' });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer valid-token');
    expect(headers.get('X-Organization-Id')).toBe('org-1');
  });

  it('rafraîchit automatiquement le token sur 401 puis rejoue la requête', async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      calls.push(url);
      if (url === '/api/auth/refresh') {
        return jsonResponse(200, { accessToken: 'fresh-token' });
      }
      const authHeader = new Headers(init?.headers).get('Authorization');
      if (authHeader === 'Bearer expired-token') {
        return jsonResponse(401, { code: 'IAM.UNAUTHORIZED', message: 'Non autorisé.' });
      }
      return jsonResponse(200, { data: 'ok' });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiFetch<{ data: string }>('/protected');

    expect(result).toEqual({ data: 'ok' });
    expect(calls.filter((u) => u === '/api/auth/refresh')).toHaveLength(1);
    expect(calls.filter((u) => u.endsWith('/protected'))).toHaveLength(2);
  });

  it('ne déclenche qu’un seul rafraîchissement pour des requêtes concurrentes en 401', async () => {
    let refreshCalls = 0;
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/auth/refresh') {
        refreshCalls += 1;
        return jsonResponse(200, { accessToken: 'fresh-token' });
      }
      const authHeader = new Headers(init?.headers).get('Authorization');
      if (authHeader === 'Bearer expired-token') {
        return jsonResponse(401, { code: 'IAM.UNAUTHORIZED', message: 'Non autorisé.' });
      }
      return jsonResponse(200, { data: 'ok' });
    });
    vi.stubGlobal('fetch', fetchMock);

    const [a, b] = await Promise.all([apiFetch('/one'), apiFetch('/two')]);

    expect(a).toEqual({ data: 'ok' });
    expect(b).toEqual({ data: 'ok' });
    expect(refreshCalls).toBe(1);
  });

  it('lève une ApiError avec le code stable sur une erreur métier', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(401, { code: 'IAM.OTP_INVALID', message: 'Code incorrect.' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/auth/otp/verify', { skipAuth: true })).rejects.toMatchObject({
      code: 'IAM.OTP_INVALID',
      message: 'Code incorrect.',
    });
  });

  it('ApiError est bien une instance exploitable', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(429, { code: 'IAM.RATE_LIMITED', message: 'Trop de demandes.' }));
    vi.stubGlobal('fetch', fetchMock);

    try {
      await apiFetch('/auth/otp/request', { skipAuth: true });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      if (error instanceof ApiError) {
        expect(error.code).toBe('IAM.RATE_LIMITED');
        expect(error.status).toBe(429);
      }
    }
  });
});
