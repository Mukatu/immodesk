import { clampLimit, decodeCursor, type CursorPayload } from './cursor';

/**
 * Fragment de pagination par curseur pour une requête SQL brute.
 *
 * L'ordre est toujours `(created_at DESC, id DESC)` : c'est la position
 * stable encodée dans le curseur (`CursorPayload`). La comparaison utilise
 * le tuple `(created_at, id) < ($n, $m)`, qui est un vrai keyset — jamais un
 * OFFSET, dont le coût croît avec la profondeur de page et qui saute des
 * lignes quand des insertions se produisent entre deux pages.
 */
export interface KeysetSlice {
  /** Condition à ajouter au WHERE, ou `null` pour la première page. */
  condition: string | null;
  /** Paramètres correspondants, à concaténer à ceux déjà présents. */
  params: unknown[];
  /** Taille de page effective, plafonnée. */
  limit: number;
  /** `LIMIT limit + 1` : la ligne excédentaire signale la page suivante. */
  fetch: number;
}

/**
 * Prépare le fragment keyset. `nextParamIndex` est le numéro du prochain
 * paramètre libre de la requête (`$3` si deux sont déjà liés).
 */
export function buildKeyset(
  options: { limit?: number; cursor?: string },
  secret: string,
  nextParamIndex: number,
  alias = '',
): KeysetSlice {
  const limit = clampLimit(options.limit);
  const prefix = alias ? `${alias}.` : '';

  if (!options.cursor) {
    return { condition: null, params: [], limit, fetch: limit + 1 };
  }

  const position: CursorPayload = decodeCursor(options.cursor, secret);
  return {
    condition: `(${prefix}created_at, ${prefix}id) < ($${nextParamIndex}::timestamptz, $${
      nextParamIndex + 1
    }::uuid)`,
    params: [position.createdAt, position.id],
    limit,
    fetch: limit + 1,
  };
}

/** `ORDER BY` canonique associé au keyset. */
export function keysetOrderBy(alias = ''): string {
  const prefix = alias ? `${alias}.` : '';
  return `ORDER BY ${prefix}created_at DESC, ${prefix}id DESC`;
}
