/**
 * Détenteur en mémoire de l'access token du portail bailleur — distinct de
 * `token-store.ts` (agence) : le rôle dérivé LANDLORD_PORTAL n'appartient à
 * aucune organisation (arbitrage n°7 du contrat phase 7), et le portail ne doit
 * jamais partager son jeton avec le rafraîchissement automatique de l'agence
 * (cookies et route BFF séparés, voir `portal-cookies.ts`).
 */

type Listener = () => void;

let portalAccessToken: string | null = null;
const listeners = new Set<Listener>();

export function getPortalAccessToken(): string | null {
  return portalAccessToken;
}

export function setPortalAccessToken(token: string | null): void {
  portalAccessToken = token;
  listeners.forEach((listener) => listener());
}

export function subscribePortalTokenStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetPortalTokenStore(): void {
  portalAccessToken = null;
}
