/**
 * Base ciblée par les handlers MSW : doit correspondre exactement à API_INTERNAL_URL,
 * la seule base que le process Next appelle réellement (route handlers /api/auth/*,
 * et le proxy /api/proxy/* pour les appels directs du navigateur — voir ce fichier).
 *
 * Isolée dans son propre module (aucune dépendance) : handlers.ts et
 * leases-handlers.ts s'importent mutuellement (handlers.ts importe `leaseHandlers`
 * pour le spread final du tableau `handlers`, leases-handlers.ts importe divers
 * helpers/Maps de handlers.ts). Le tableau `leaseHandlers` construit ses routes
 * au chargement du module (`http.get(\`${API_BASE}/...\`, ...)`), donc si
 * `API_BASE` venait de handlers.ts, il serait lu avant que ce dernier ait fini de
 * s'évaluer (TDZ) dès que leases-handlers.ts est chargé en premier dans le cycle —
 * ce qui casse le build de production (webpack y est plus strict qu'en dev).
 * En important API_BASE d'ici, aucun des deux fichiers n'a besoin d'attendre l'autre
 * pour cette valeur précise.
 */
export const API_BASE = process.env.API_INTERNAL_URL ?? 'https://mock.immodesk.internal/v1';
