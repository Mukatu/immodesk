import { DomainError } from '../../../shared/errors/domain-error';

/** SQLSTATE d'une violation de contrainte d'exclusion PostgreSQL. */
export const EXCLUSION_VIOLATION = '23P01';

/** Nom de la contrainte anti-chevauchement (migration `2_leases_revisions`). */
export const LEASE_OVERLAP_CONSTRAINT = 'leases_no_overlap_excl';

/**
 * Traduit une violation de `leases_no_overlap_excl` en
 * `409 LEASES.OVERLAP`.
 *
 * POURQUOI UNE TRADUCTION ET NON UNE VÉRIFICATION PRÉALABLE SEULE — le
 * service contrôle bien le chevauchement avant d'écrire, mais entre ce
 * contrôle et le COMMIT, une transaction concurrente peut activer un autre
 * bail sur le même lot. Seule la contrainte d'exclusion, tenue par le
 * moteur, ferme définitivement la fenêtre. Il reste à en faire une réponse
 * lisible : un client ne doit jamais voir passer un SQLSTATE.
 *
 * Prisma enveloppe l'erreur différemment selon le chemin (API de modèle ou
 * requête brute) : tantôt `meta.code`, tantôt seulement le message. Les deux
 * sont inspectés, et toute erreur non reconnue est relancée telle quelle —
 * masquer une erreur inconnue derrière un code métier serait pire que de la
 * laisser remonter.
 */
export function translateLeaseOverlap(error: unknown): never {
  if (isExclusionViolation(error, LEASE_OVERLAP_CONSTRAINT)) {
    throw new DomainError('LEASES.OVERLAP', {
      constraint: LEASE_OVERLAP_CONSTRAINT,
      sqlState: EXCLUSION_VIOLATION,
    });
  }
  throw error;
}

/** Exécute `work` en traduisant une éventuelle violation d'exclusion. */
export async function withOverlapTranslation<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    return translateLeaseOverlap(error);
  }
}

export function isExclusionViolation(error: unknown, constraint?: string): boolean {
  if (typeof error !== 'object' || error === null) return false;

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    meta?: { code?: unknown; constraint?: unknown; message?: unknown };
  };

  const codes = [candidate.code, candidate.meta?.code].map((c) => (typeof c === 'string' ? c : ''));
  const texts = [candidate.message, candidate.meta?.message, candidate.meta?.constraint]
    .filter((t): t is string => typeof t === 'string')
    .join(' ');

  const isExclusion = codes.includes(EXCLUSION_VIOLATION) || texts.includes(EXCLUSION_VIOLATION);
  if (!isExclusion) return false;
  return constraint === undefined || texts.includes(constraint);
}
