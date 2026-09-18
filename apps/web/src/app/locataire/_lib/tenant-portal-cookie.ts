/**
 * Marqueur de présence de session du portail locataire, lisible par
 * `middleware.ts` (exécuté côté edge, sans accès à `sessionStorage`).
 *
 * Le portail locataire n'a, par construction, aucun cookie de session
 * serveur : `tenant-auth-context.tsx` garde l'access token en mémoire et le
 * mémorise dans `sessionStorage` uniquement, sans mécanisme de
 * rafraîchissement (voir son commentaire). Ce cookie ne porte donc jamais le
 * jeton lui-même — seulement un drapeau non sensible ("1" / absent), posé et
 * retiré côté client (voir `tenant-session-flag.tsx`) au gré de
 * `useTenantAuth().status`, pour permettre au middleware de rediriger vers la
 * connexion quand la session est absente, sans jamais authentifier une
 * requête serveur avec sa valeur.
 */
export const TENANT_PORTAL_SESSION_FLAG_COOKIE = 'immodesk_tenant_portal_flag';

export const TENANT_PORTAL_LOGIN_PATH = '/locataire/connexion';

/**
 * Pose le drapeau de façon synchrone. Appelé à la fois par `tenant-session-flag.tsx`
 * (réactif à `useTenantAuth().status`) et directement par la page de connexion
 * juste avant `router.push('/locataire')` : un `useEffect` seul arriverait trop
 * tard, après le déclenchement de la navigation qui traverse le middleware.
 */
export function writeTenantPortalSessionFlag(): void {
  document.cookie = `${TENANT_PORTAL_SESSION_FLAG_COOKIE}=1; path=/locataire; max-age=${60 * 60 * 24}; SameSite=Lax`;
}

export function clearTenantPortalSessionFlag(): void {
  document.cookie = `${TENANT_PORTAL_SESSION_FLAG_COOKIE}=; path=/locataire; max-age=0; SameSite=Lax`;
}
