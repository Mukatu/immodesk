/**
 * Détenteur en mémoire de l'access token du portail locataire — distinct de
 * `token-store.ts` (agence) et de `portal-token-store.ts` (bailleur) : le
 * locataire n'a aucun rôle stocké, sa session repose uniquement sur ce jeton
 * obtenu par OTP téléphonique (`/tenant-auth/otp/verify`), sans mécanisme de
 * rafraîchissement côté serveur.
 */

type Listener = () => void;

let tenantAccessToken: string | null = null;
const listeners = new Set<Listener>();

export function getTenantAccessToken(): string | null {
  return tenantAccessToken;
}

export function setTenantAccessToken(token: string | null): void {
  tenantAccessToken = token;
  listeners.forEach((listener) => listener());
}

export function subscribeTenantTokenStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetTenantTokenStore(): void {
  tenantAccessToken = null;
}
