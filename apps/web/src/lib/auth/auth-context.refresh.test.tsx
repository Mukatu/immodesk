import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from '@/lib/auth/auth-context';
import { apiFetch } from '@/lib/api/client';
import { resetTokenStore } from '@/lib/api/token-store';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Simule la rotation : un refresh token n'est utilisable qu'une fois. */
function stubRotatingBackend() {
  let refreshCalls = 0;
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url === '/api/auth/refresh') {
      refreshCalls += 1;
      await new Promise((r) => setTimeout(r, 10));
      // Le 2e appel présente un jeton déjà consommé : 401 (et famille révoquée côté API).
      if (refreshCalls > 1) return json(401, { code: 'IAM.REFRESH_REVOKED', message: 'x' });
      return json(200, { accessToken: 'access-1' });
    }
    const auth = new Headers(init?.headers).get('Authorization');
    if (auth !== 'Bearer access-1') return json(401, { code: 'IAM.UNAUTHORIZED', message: 'x' });
    return json(200, { user: { id: 'u1' }, organizations: [] });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { refreshCount: () => refreshCalls };
}

function Probe() {
  const { status } = useAuth();
  // Composant enfant qui déclenche une requête dès le montage, avant l'hydratation.
  React.useEffect(() => {
    void apiFetch('/me').catch(() => null);
  }, []);
  return <p>statut:{status}</p>;
}

describe('AuthProvider : rafraîchissement de session', () => {
  beforeEach(() => resetTokenStore());
  afterEach(() => {
    vi.unstubAllGlobals();
    resetTokenStore();
  });

  it('ne lance qu’un seul rafraîchissement au chargement (StrictMode + requête au montage)', async () => {
    const backend = stubRotatingBackend();
    render(
      <React.StrictMode>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </React.StrictMode>,
    );
    await waitFor(() => expect(screen.getByText(/statut:(?!loading)/)).toBeInTheDocument());
    expect(screen.getByText('statut:authenticated')).toBeInTheDocument();
    expect(backend.refreshCount()).toBe(1);
  });
});
