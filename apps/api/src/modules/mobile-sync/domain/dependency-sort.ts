import { SYNC_INTERNAL_CODES } from './sync-types';

export interface DependencySortItem {
  clientRef: string;
  dependsOn?: string[];
  clientCreatedAt: string;
}

export type DependencySkipReason =
  typeof SYNC_INTERNAL_CODES.DEPENDENCY_REJECTED | typeof SYNC_INTERNAL_CODES.DEPENDENCY_CYCLE;

export interface DependencySortResult {
  /** `clientRef` dans l'ordre où ils doivent être appliqués. */
  order: string[];
  /** `clientRef` qui ne seront jamais appliqués, avec le motif. */
  skipped: Map<string, DependencySkipReason>;
}

/**
 * Trie les opérations d'un lot par `dependsOn` (ordre topologique) puis par
 * `clientCreatedAt` croissant à égalité (docs/api/phase5-contract.md,
 * « Règles d'application »).
 *
 * Une dépendance absente du lot — ou dépendant elle-même d'une dépendance
 * absente, en cascade — rend l'opération définitivement inapplicable :
 * `SYNC.DEPENDENCY_REJECTED`. Un cycle entre opérations par ailleurs
 * résolubles est distingué par `SYNC.DEPENDENCY_CYCLE` : les deux motifs
 * sont couverts séparément par les tests unitaires.
 */
export function sortByDependencies(ops: DependencySortItem[]): DependencySortResult {
  const byRef = new Map(ops.map((op) => [op.clientRef, op]));
  const originalIndex = new Map(ops.map((op, index) => [op.clientRef, index]));
  const skipped = new Map<string, DependencySkipReason>();

  // Point fixe : toute opération référençant un `clientRef` absent du lot,
  // elle-même, ou déjà marquée inapplicable, l'est en cascade.
  let changed = true;
  while (changed) {
    changed = false;
    for (const op of ops) {
      if (skipped.has(op.clientRef)) continue;
      const deps = op.dependsOn ?? [];
      const unresolvable = deps.some(
        (dep) => dep === op.clientRef || !byRef.has(dep) || skipped.has(dep),
      );
      if (unresolvable) {
        skipped.set(op.clientRef, SYNC_INTERNAL_CODES.DEPENDENCY_REJECTED);
        changed = true;
      }
    }
  }

  // Kahn sur le sous-graphe restant : toutes les dépendances y sont valides
  // et non sautées, par construction du point fixe ci-dessus.
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  const remaining = new Set<string>();
  for (const op of ops) {
    if (skipped.has(op.clientRef)) continue;
    remaining.add(op.clientRef);
    dependents.set(op.clientRef, []);
  }
  for (const ref of remaining) {
    const op = byRef.get(ref)!;
    const deps = (op.dependsOn ?? []).filter((d) => remaining.has(d));
    indegree.set(ref, deps.length);
    for (const dep of deps) dependents.get(dep)!.push(ref);
  }

  const order: string[] = [];
  while (remaining.size > 0) {
    const ready = [...remaining].filter((ref) => (indegree.get(ref) ?? 0) === 0);
    if (ready.length === 0) break; // cycle véritable parmi les restants
    ready.sort((a, b) => {
      const ta = Date.parse(byRef.get(a)!.clientCreatedAt);
      const tb = Date.parse(byRef.get(b)!.clientCreatedAt);
      if (ta !== tb) return ta - tb;
      return originalIndex.get(a)! - originalIndex.get(b)!;
    });
    const next = ready[0];
    order.push(next);
    remaining.delete(next);
    for (const dep of dependents.get(next) ?? []) {
      indegree.set(dep, (indegree.get(dep) ?? 0) - 1);
    }
  }

  for (const ref of remaining) {
    skipped.set(ref, SYNC_INTERNAL_CODES.DEPENDENCY_CYCLE);
  }

  return { order, skipped };
}
