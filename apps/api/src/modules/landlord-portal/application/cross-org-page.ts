import { clampLimit, decodeCursor, encodeCursor } from '../../../shared/pagination/cursor';

export interface CrossOrgPageInfo {
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
}

export interface CrossOrgPage<T> {
  items: T[];
  pageInfo: CrossOrgPageInfo;
}

/** Ligne triable : `sortAt` porte le champ métier qui définit l'ordre d'affichage. */
export interface SortableRow {
  id: string;
  sortAt: Date;
}

/**
 * Pagination du portail bailleur, cross-organisations.
 *
 * `landlords` est sous RLS : chaque organisation liée au bailleur doit être
 * lue séparément (`withTenant` par organisation, voir `LandlordPortalQueryService`).
 * Simplification assumée (contrat, § Portail bailleur) : plutôt qu'un vrai
 * curseur keyset par organisation — inutilement complexe pour un volume par
 * bailleur toujours faible (quelques dizaines de lignes, une poignée
 * d'agences au plus) — chaque organisation est lue en entier, les lignes
 * sont fusionnées puis triées en mémoire par `sortAt` décroissant, et le
 * curseur n'est qu'une position `(sortAt, id)` dans cette liste fusionnée.
 */
export function paginateMerged<T extends SortableRow>(
  rows: T[],
  limit: number | undefined,
  cursor: string | undefined,
  secret: string,
): CrossOrgPage<T> {
  const effectiveLimit = clampLimit(limit);
  let merged = [...rows].sort(
    (a, b) => b.sortAt.getTime() - a.sortAt.getTime() || (a.id < b.id ? 1 : -1),
  );

  if (cursor) {
    const position = decodeCursor(cursor, secret);
    const positionTime = new Date(position.createdAt).getTime();
    merged = merged.filter(
      (row) =>
        row.sortAt.getTime() < positionTime ||
        (row.sortAt.getTime() === positionTime && row.id < position.id),
    );
  }

  const hasNextPage = merged.length > effectiveLimit;
  const items = hasNextPage ? merged.slice(0, effectiveLimit) : merged;
  const last = items.at(-1);

  return {
    items,
    pageInfo: {
      nextCursor:
        hasNextPage && last
          ? encodeCursor({ createdAt: last.sortAt.toISOString(), id: last.id }, secret)
          : null,
      hasNextPage,
      limit: effectiveLimit,
    },
  };
}
