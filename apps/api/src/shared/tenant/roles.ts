import type { MemberRole } from './tenant-context';

export const MEMBER_ROLES: readonly MemberRole[] = [
  'OWNER',
  'MANAGER',
  'ACCOUNTANT',
  'COLLECTOR',
  'VIEWER',
] as const;

/**
 * Hiérarchie des rôles : OWNER > MANAGER > ACCOUNTANT = COLLECTOR > VIEWER.
 *
 * ACCOUNTANT et COLLECTOR partagent le même rang mais ne sont PAS
 * interchangeables : ils couvrent des périmètres différents (lecture
 * financière contre encaissement terrain). Une exigence portant sur l'un
 * n'est donc jamais satisfaite par l'autre — d'où la vérification
 * d'appartenance explicite dans `satisfiesRequirement`.
 */
export const ROLE_RANK: Readonly<Record<MemberRole, number>> = {
  OWNER: 40,
  MANAGER: 30,
  ACCOUNTANT: 20,
  COLLECTOR: 20,
  VIEWER: 10,
};

/** Rôles de même rang non ordonnés entre eux. */
const UNORDERED_PEERS: ReadonlyArray<ReadonlySet<MemberRole>> = [
  new Set<MemberRole>(['ACCOUNTANT', 'COLLECTOR']),
];

function arePeersButDistinct(a: MemberRole, b: MemberRole): boolean {
  if (a === b) return false;
  return UNORDERED_PEERS.some((peers) => peers.has(a) && peers.has(b));
}

/**
 * Vrai si `actual` satisfait l'exigence `required` :
 * - rang strictement supérieur : oui ;
 * - rang égal : uniquement si c'est le même rôle (les pairs non ordonnés
 *   ne se substituent pas l'un à l'autre) ;
 * - rang inférieur : non.
 */
export function roleSatisfies(actual: MemberRole, required: MemberRole): boolean {
  if (actual === required) return true;
  if (arePeersButDistinct(actual, required)) return false;
  return ROLE_RANK[actual] > ROLE_RANK[required];
}

/** Vrai si `actual` satisfait au moins une des exigences listées. */
export function satisfiesAnyRole(actual: MemberRole, required: readonly MemberRole[]): boolean {
  if (required.length === 0) return true;
  return required.some((r) => roleSatisfies(actual, r));
}

export function isMemberRole(value: unknown): value is MemberRole {
  return typeof value === 'string' && (MEMBER_ROLES as readonly string[]).includes(value);
}
