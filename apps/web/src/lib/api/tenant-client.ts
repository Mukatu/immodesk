import { ApiError, genericErrorMessage, toApiError } from '@/lib/api/errors';
import { getTenantAccessToken } from '@/lib/api/tenant-token-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';

export interface TenantFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
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

/**
 * Client API du portail locataire : jamais de X-Organization-Id, jeton isolé
 * de l'agence et du bailleur. Aucune route de rafraîchissement n'existe côté
 * serveur pour ce portail — un 401 est simplement propagé (pas de retry).
 */
export async function tenantApiFetch<T>(
  path: string,
  options: TenantFetchOptions = {},
): Promise<T> {
  const { body, skipAuth = false, headers: extraHeaders, ...rest } = options;

  const headers = new Headers(extraHeaders);
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  if (!skipAuth) {
    const token = getTenantAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return undefined as T;

  const payload = await parseJsonSafe(response);
  if (!response.ok) throw toApiError(response.status, payload);
  return payload as T;
}

export { ApiError, genericErrorMessage };
