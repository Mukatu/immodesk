import { ApiError, genericErrorMessage, toApiError } from '@/lib/api/errors';
import { getPortalAccessToken, setPortalAccessToken } from '@/lib/api/portal-token-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';

export interface PortalFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
  skipRefreshRetry?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

/** Rafraîchit via la route BFF dédiée au portail (cookie `immodesk_portal_refresh_token`). */
async function refreshPortalAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch('/api/portal-auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (!response.ok) {
          setPortalAccessToken(null);
          return null;
        }
        const data = (await response.json()) as { accessToken: string };
        setPortalAccessToken(data.accessToken);
        return data.accessToken;
      } catch {
        setPortalAccessToken(null);
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Client API du portail bailleur : jamais de X-Organization-Id, jeton et rafraîchissement isolés de l'agence. */
export async function portalApiFetch<T>(
  path: string,
  options: PortalFetchOptions = {},
): Promise<T> {
  const {
    body,
    skipAuth = false,
    skipRefreshRetry = false,
    headers: extraHeaders,
    ...rest
  } = options;

  const headers = new Headers(extraHeaders);
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  if (!skipAuth) {
    const token = getPortalAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && !skipAuth && !skipRefreshRetry) {
    const newToken = await refreshPortalAccessToken();
    if (newToken) {
      return portalApiFetch<T>(path, { ...options, skipRefreshRetry: true });
    }
  }

  if (response.status === 204) return undefined as T;

  const payload = await parseJsonSafe(response);
  if (!response.ok) throw toApiError(response.status, payload);
  return payload as T;
}

export { ApiError, genericErrorMessage };
