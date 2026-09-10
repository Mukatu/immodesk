import { randomBytes } from 'node:crypto';
import { v7 as uuidV7, validate as uuidValidate, version as uuidVersion } from 'uuid';

/**
 * Identifiants applicatifs : UUID v7 généré côté application.
 * Le SQL conserve `gen_random_uuid()` en valeur par défaut (v4) pour les
 * insertions faites hors application (seed SQL, back-office).
 */
export function newId(): string {
  return uuidV7();
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && uuidValidate(value);
}

/** Vrai si la valeur est un UUID quelconque ; la version n'est pas contrainte. */
export function uuidVersionOf(value: string): number | null {
  return uuidValidate(value) ? uuidVersion(value) : null;
}

/**
 * Génère un jeton opaque cryptographiquement sûr, encodé en base64url.
 * Utilisé pour les refresh tokens et les jetons d'invitation.
 */
export function newOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}
