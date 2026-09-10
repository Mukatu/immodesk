/**
 * Génération du `slug` d'une organisation.
 *
 * Le slug est court, URL-safe et surtout STABLE : il entre dans la
 * numérotation des reçus de caisse (`CASH-{org}-{collector}-{seq}`), donc
 * il ne doit jamais être régénéré après création.
 */
const MAX_SLUG_LENGTH = 32;

export function slugify(value: string): string {
  const base = value
    .normalize('NFD')
    // Suppression des diacritiques (é → e, ç → c).
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');

  return base.length > 0 ? base : 'organisation';
}

/**
 * Décline un slug en `base`, `base-2`, `base-3`... jusqu'à trouver une
 * valeur libre. `isTaken` interroge l'unicité globale de `organizations.slug`.
 */
export async function resolveUniqueSlug(
  desired: string,
  isTaken: (candidate: string) => Promise<boolean>,
  maxAttempts = 50,
): Promise<string> {
  const base = slugify(desired);
  if (!(await isTaken(base))) return base;

  for (let suffix = 2; suffix <= maxAttempts; suffix += 1) {
    const marker = `-${suffix}`;
    const candidate = `${base.slice(0, MAX_SLUG_LENGTH - marker.length)}${marker}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error(`Impossible de dériver un slug libre à partir de « ${desired} ».`);
}
