/**
 * Reconnaissance des violations d'unicité, quel que soit le chemin Prisma.
 *
 * L'API de modèle lève `P2002` (avec `meta.target`), une requête brute lève
 * `P2010` en recopiant le SQLSTATE `23505` dans le message. Les deux formes
 * sont inspectées ; `hint` restreint la reconnaissance à une contrainte ou à
 * un jeu de colonnes précis (`rent_invoices_period_uk`, `client_ref`).
 *
 * C'est la base, et non un contrôle préalable, qui ferme la fenêtre entre
 * deux requêtes concurrentes : l'application traduit ensuite l'erreur en
 * réponse métier (409 lisible, ou rejeu idempotent).
 */
export function isUniqueViolation(error: unknown, hint?: string): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as {
    code?: unknown;
    message?: unknown;
    meta?: { code?: unknown; target?: unknown; message?: unknown };
  };
  const codes = [candidate.code, candidate.meta?.code].filter((c) => typeof c === 'string');
  const target = candidate.meta?.target;
  const texts = [
    typeof candidate.message === 'string' ? candidate.message : '',
    typeof candidate.meta?.message === 'string' ? candidate.meta.message : '',
    Array.isArray(target) ? target.join(',') : typeof target === 'string' ? target : '',
  ].join(' ');

  const isUnique =
    codes.includes('P2002') || codes.includes('23505') || /23505|unique constraint/i.test(texts);
  if (!isUnique) return false;
  return hint === undefined || texts.includes(hint);
}
