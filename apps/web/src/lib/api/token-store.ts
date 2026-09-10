/**
 * Détenteur en mémoire de l'access token et de l'organisation courante.
 * Jamais persisté (ni localStorage ni cookie non-httpOnly) : perdu au rechargement de page,
 * ce qui force un rafraîchissement via le refresh token httpOnly.
 */

type Listener = () => void;

let accessToken: string | null = null;
let currentOrganizationId: string | null = null;
const listeners = new Set<Listener>();

const ORG_STORAGE_KEY = 'immodesk:last-organization-id';

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  listeners.forEach((listener) => listener());
}

export function getCurrentOrganizationId(): string | null {
  if (currentOrganizationId) return currentOrganizationId;
  if (typeof window !== 'undefined') {
    currentOrganizationId = window.localStorage.getItem(ORG_STORAGE_KEY);
  }
  return currentOrganizationId;
}

export function setCurrentOrganizationId(id: string | null): void {
  currentOrganizationId = id;
  if (typeof window !== 'undefined') {
    if (id) {
      window.localStorage.setItem(ORG_STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(ORG_STORAGE_KEY);
    }
  }
  listeners.forEach((listener) => listener());
}

export function subscribeTokenStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetTokenStore(): void {
  accessToken = null;
  currentOrganizationId = null;
}
