import { ApiError, genericErrorMessage, toApiError } from '@/lib/api/errors';
import { getAccessToken, getCurrentOrganizationId, setAccessToken } from '@/lib/api/token-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1';

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Ajoute l'en-tête X-Organization-Id (par défaut : organisation courante en mémoire). */
  organizationId?: string | null;
  /** Ne tente pas d'injecter Authorization (routes publiques). */
  skipAuth?: boolean;
  /** Empêche la tentative de rafraîchissement automatique sur 401 (évite les boucles). */
  skipRefreshRetry?: boolean;
  idempotencyKey?: string;
}

let refreshPromise: Promise<string | null> | null = null;

/**
 * Rafraîchit l'access token via la route BFF Next (qui porte le refresh token httpOnly).
 * Toutes les requêtes concurrentes qui échouent en 401 partagent la même promesse :
 * une seule tentative de rafraîchissement est en vol à la fois (file d'attente implicite).
 */
async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (!response.ok) {
          setAccessToken(null);
          return null;
        }
        const data = (await response.json()) as { accessToken: string };
        setAccessToken(data.accessToken);
        return data.accessToken;
      } catch {
        setAccessToken(null);
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

/** Construit la requête (URL + en-têtes + corps) commune à apiFetch et apiFetchText. */
function buildRequest(path: string, options: ApiFetchOptions): { url: string; init: RequestInit } {
  const {
    body,
    organizationId,
    skipAuth = false,
    idempotencyKey,
    headers: extraHeaders,
    ...rest
  } = options;

  const headers = new Headers(extraHeaders);
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const orgId = organizationId === undefined ? getCurrentOrganizationId() : organizationId;
  if (orgId) {
    headers.set('X-Organization-Id', orgId);
  }

  if (idempotencyKey) {
    headers.set('Idempotency-Key', idempotencyKey);
  }

  return {
    url: `${API_BASE_URL}${path}`,
    init: { ...rest, headers, body: body === undefined ? undefined : JSON.stringify(body) },
  };
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { skipAuth = false, skipRefreshRetry = false } = options;
  const { url, init } = buildRequest(path, options);

  const response = await fetch(url, init);

  if (response.status === 401 && !skipAuth && !skipRefreshRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch<T>(path, { ...options, skipRefreshRetry: true });
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await parseJsonSafe(response);

  if (!response.ok) {
    throw toApiError(response.status, payload);
  }

  return payload as T;
}

/**
 * Variante de apiFetch qui retourne le corps brut en texte (réponse `text/html`,
 * ex. aperçu du gabarit de contrat) au lieu de parser du JSON. Mêmes en-têtes
 * (Authorization, X-Organization-Id) et même logique de rafraîchissement sur 401.
 */
export async function apiFetchText(path: string, options: ApiFetchOptions = {}): Promise<string> {
  const { skipAuth = false, skipRefreshRetry = false } = options;
  const { url, init } = buildRequest(path, options);

  const response = await fetch(url, init);

  if (response.status === 401 && !skipAuth && !skipRefreshRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetchText(path, { ...options, skipRefreshRetry: true });
    }
  }

  if (!response.ok) {
    const payload = await parseJsonSafe(response);
    if (payload && typeof payload === 'object' && 'code' in payload && 'message' in payload) {
      throw toApiError(response.status, payload);
    }
    throw new ApiError(response.status, { code: 'HTTP.UNKNOWN', message: genericErrorMessage });
  }

  return response.text();
}

export { ApiError };
