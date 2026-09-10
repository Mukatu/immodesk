/**
 * Entrée du journal d'audit.
 *
 * `audit_logs.action` est une énumération SQL fermée
 * (CREATE, UPDATE, DELETE, STATE_TRANSITION, LOGIN, EXPORT, IMPORT).
 * Le nom métier fin de l'opération (`OTP_LOCKED`, `MEMBER_ROLE_CHANGED`,
 * `INVITATION_ACCEPTED`, ...) est porté par `operation`, stocké dans la
 * colonne `reason` et repris dans `new_state.operation` : le journal reste
 * requêtable par nom d'opération sans modifier l'énumération SQL.
 */
export type AuditAction =
  'CREATE' | 'UPDATE' | 'DELETE' | 'STATE_TRANSITION' | 'LOGIN' | 'EXPORT' | 'IMPORT';

/** Noms d'opérations métier tracés en phase 0. */
export const AUDIT_OPERATIONS = {
  OTP_REQUESTED: 'OTP_REQUESTED',
  OTP_VERIFIED: 'OTP_VERIFIED',
  OTP_LOCKED: 'OTP_LOCKED',
  REFRESH_ROTATED: 'REFRESH_ROTATED',
  REFRESH_REUSE_DETECTED: 'REFRESH_REUSE_DETECTED',
  LOGOUT: 'LOGOUT',
  USER_UPDATED: 'USER_UPDATED',
  ORGANIZATION_CREATED: 'ORGANIZATION_CREATED',
  ORGANIZATION_UPDATED: 'ORGANIZATION_UPDATED',
  ORGANIZATION_SETTINGS_UPDATED: 'ORGANIZATION_SETTINGS_UPDATED',
  MEMBER_ROLE_CHANGED: 'MEMBER_ROLE_CHANGED',
  MEMBER_REMOVED: 'MEMBER_REMOVED',
  MEMBER_JOINED: 'MEMBER_JOINED',
  INVITATION_CREATED: 'INVITATION_CREATED',
  INVITATION_REVOKED: 'INVITATION_REVOKED',
  INVITATION_ACCEPTED: 'INVITATION_ACCEPTED',
} as const;

export type AuditOperation = (typeof AUDIT_OPERATIONS)[keyof typeof AUDIT_OPERATIONS];

export type JsonState = Record<string, unknown> | null;

export interface AuditEntry {
  organizationId: string;
  action: AuditAction;
  operation: AuditOperation | string;
  entityType: string;
  entityId: string;
  actorUserId?: string | null;
  actorLabel?: string | null;
  actorRole?: 'OWNER' | 'MANAGER' | 'COLLECTOR' | 'ACCOUNTANT' | 'VIEWER' | null;
  previousState?: JsonState;
  newState?: JsonState;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

/**
 * Champs dont la valeur diffère entre l'état avant et l'état après.
 * Les valeurs non comparables (objets, tableaux) sont comparées par leur
 * sérialisation JSON stable.
 */
export function changedFields(previous: JsonState, next: JsonState): string[] {
  if (!previous || !next) return next ? Object.keys(next) : [];
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  const changed: string[] = [];
  for (const key of keys) {
    if (stableStringify(previous[key]) !== stableStringify(next[key])) {
      changed.push(key);
    }
  }
  return changed.sort();
}

/**
 * Sérialisation JSON déterministe et sûre pour JSONB :
 * les BigInt deviennent des chaînes (aucun montant ne passe par un flottant),
 * les dates des chaînes ISO 8601, les clés sont triées.
 */
export function toJsonState(value: unknown): JsonState {
  if (value === null || value === undefined) return null;
  const normalized = JSON.parse(stableStringify(value) ?? 'null');
  return typeof normalized === 'object' && normalized !== null
    ? (normalized as Record<string, unknown>)
    : { value: normalized };
}

function stableStringify(value: unknown): string | undefined {
  return JSON.stringify(value, (_key, raw) => {
    if (typeof raw === 'bigint') return raw.toString(10);
    if (raw instanceof Date) return raw.toISOString();
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return Object.fromEntries(
        Object.entries(raw as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)),
      );
    }
    return raw;
  });
}
