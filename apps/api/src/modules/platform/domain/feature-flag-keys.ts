/**
 * Registre des clés de drapeaux GLOBAUX pilotées par la console de
 * plateforme (`/v1/admin/feature-flags/{key}`, `/v1/admin/go-live/*`,
 * `/v1/admin/incidents/*`).
 *
 * `feature_flags.key` est un `text` libre : le DDL ne porte AUCUNE
 * contrainte `CHECK` sur les valeurs (docs/schema/schema.sql). Cette liste
 * est donc une convention applicative, pas une énumération SQL — elle
 * reprend nommément les seules clés que le contrat de la phase 11 attribue
 * à la plateforme (arbitrages 14, 15 et 18). `PLATFORM.FLAG_KEY_UNKNOWN` est
 * renvoyé pour toute autre clé sur cette route.
 */
export const PLATFORM_FLAG_KEYS = [
  'read_only_mode',
  'platform_incident',
  'platform_maintenance',
  'security_audit_cleared',
  'commercial_launch',
] as const;

export type PlatformFlagKey = (typeof PLATFORM_FLAG_KEYS)[number];

export function isKnownPlatformFlagKey(key: string): key is PlatformFlagKey {
  return (PLATFORM_FLAG_KEYS as readonly string[]).includes(key);
}

/**
 * Drapeaux de CONDUITE d'incident, dont l'écriture reste autorisée pendant
 * un gel en lecture seule (arbitrage 18) : `commercial_launch` n'en fait pas
 * partie, ouvrir une vague pendant une panne serait la décision à ne pas
 * prendre. Exposé ici pour que le garde transversal de lecture seule
 * (`app.module.ts`, hors périmètre de ce module) puisse s'y référer sans
 * dupliquer la liste.
 */
export const INCIDENT_CONDUCT_FLAG_KEYS: readonly PlatformFlagKey[] = [
  'read_only_mode',
  'platform_incident',
  'platform_maintenance',
  'security_audit_cleared',
];
