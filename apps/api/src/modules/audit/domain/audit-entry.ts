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

  // --- Phase 1 : tiers et patrimoine ------------------------------------
  LANDLORD_CREATED: 'LANDLORD_CREATED',
  LANDLORD_UPDATED: 'LANDLORD_UPDATED',
  LANDLORD_DELETED: 'LANDLORD_DELETED',
  SELF_LANDLORD_PROVISIONED: 'SELF_LANDLORD_PROVISIONED',
  TENANT_CREATED: 'TENANT_CREATED',
  TENANT_UPDATED: 'TENANT_UPDATED',
  TENANT_DELETED: 'TENANT_DELETED',
  GUARANTOR_CREATED: 'GUARANTOR_CREATED',
  GUARANTOR_UPDATED: 'GUARANTOR_UPDATED',
  GUARANTOR_DELETED: 'GUARANTOR_DELETED',
  CONTACT_CHANNEL_CREATED: 'CONTACT_CHANNEL_CREATED',
  CONTACT_CHANNEL_UPDATED: 'CONTACT_CHANNEL_UPDATED',
  CONTACT_CHANNEL_DELETED: 'CONTACT_CHANNEL_DELETED',
  PROPERTY_CREATED: 'PROPERTY_CREATED',
  PROPERTY_UPDATED: 'PROPERTY_UPDATED',
  PROPERTY_DELETED: 'PROPERTY_DELETED',
  UNIT_CREATED: 'UNIT_CREATED',
  UNITS_BULK_CREATED: 'UNITS_BULK_CREATED',
  UNIT_UPDATED: 'UNIT_UPDATED',
  UNIT_DELETED: 'UNIT_DELETED',
  BANK_ACCOUNT_CREATED: 'BANK_ACCOUNT_CREATED',
  BANK_ACCOUNT_UPDATED: 'BANK_ACCOUNT_UPDATED',
  BANK_ACCOUNT_DEACTIVATED: 'BANK_ACCOUNT_DEACTIVATED',
  DOCUMENT_UPLOAD_URL_ISSUED: 'DOCUMENT_UPLOAD_URL_ISSUED',
  DOCUMENT_REGISTERED: 'DOCUMENT_REGISTERED',
  DOCUMENT_DOWNLOAD_URL_ISSUED: 'DOCUMENT_DOWNLOAD_URL_ISSUED',
  DOCUMENT_DELETED: 'DOCUMENT_DELETED',
  DOCUMENT_PURGED: 'DOCUMENT_PURGED',

  // --- Phase 2 : baux, dépôts de garantie et contrat PDF ----------------
  LEASE_CREATED: 'LEASE_CREATED',
  LEASE_UPDATED: 'LEASE_UPDATED',
  LEASE_DELETED: 'LEASE_DELETED',
  LEASE_ACTIVATED: 'LEASE_ACTIVATED',
  LEASE_CANCELLED: 'LEASE_CANCELLED',
  LEASE_NOTICE_GIVEN: 'LEASE_NOTICE_GIVEN',
  LEASE_TERMINATED: 'LEASE_TERMINATED',
  LEASE_EXPIRED: 'LEASE_EXPIRED',
  LEASE_RENEWED: 'LEASE_RENEWED',
  LEASE_PARTY_ADDED: 'LEASE_PARTY_ADDED',
  LEASE_PARTY_UPDATED: 'LEASE_PARTY_UPDATED',
  LEASE_PARTY_REMOVED: 'LEASE_PARTY_REMOVED',
  LEASE_RENT_REVISION_CREATED: 'LEASE_RENT_REVISION_CREATED',
  LEASE_RENT_REVISION_APPLIED: 'LEASE_RENT_REVISION_APPLIED',
  LEASE_DOCUMENT_ATTACHED: 'LEASE_DOCUMENT_ATTACHED',
  LEASE_CONTRACT_REQUESTED: 'LEASE_CONTRACT_REQUESTED',
  LEASE_CONTRACT_GENERATED: 'LEASE_CONTRACT_GENERATED',
  CONTRACT_TEMPLATE_UPDATED: 'CONTRACT_TEMPLATE_UPDATED',
  DEPOSIT_CREATED: 'DEPOSIT_CREATED',
  DEPOSIT_MOVEMENT_RECORDED: 'DEPOSIT_MOVEMENT_RECORDED',
  DEPOSIT_STATUS_CHANGED: 'DEPOSIT_STATUS_CHANGED',
  LEASE_CRON_RUN: 'LEASE_CRON_RUN',

  // --- Phase 3 : facturation, encaissements, quittances, messagerie ----
  INVOICE_CREATED: 'INVOICE_CREATED',
  INVOICE_ISSUED: 'INVOICE_ISSUED',
  INVOICE_LINE_ADDED: 'INVOICE_LINE_ADDED',
  INVOICE_LINE_REMOVED: 'INVOICE_LINE_REMOVED',
  INVOICE_CANCELLED: 'INVOICE_CANCELLED',
  INVOICE_STATUS_CHANGED: 'INVOICE_STATUS_CHANGED',
  INVOICE_OVERDUE: 'INVOICE_OVERDUE',
  INVOICE_PENALTY_APPLIED: 'INVOICE_PENALTY_APPLIED',
  BILLING_RUN: 'BILLING_RUN',
  PENALTY_RULE_CREATED: 'PENALTY_RULE_CREATED',
  PENALTY_RULE_UPDATED: 'PENALTY_RULE_UPDATED',
  PAYMENT_CREATED: 'PAYMENT_CREATED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  PAYMENT_REJECTED: 'PAYMENT_REJECTED',
  PAYMENT_ALLOCATED: 'PAYMENT_ALLOCATED',
  PAYMENT_REVERSED: 'PAYMENT_REVERSED',
  TENANT_CREDIT_CREATED: 'TENANT_CREDIT_CREATED',
  TENANT_CREDIT_APPLIED: 'TENANT_CREDIT_APPLIED',
  TENANT_CREDIT_REFUNDED: 'TENANT_CREDIT_REFUNDED',
  CASH_RECEIPT_ISSUED: 'CASH_RECEIPT_ISSUED',
  CASH_RECEIPT_CANCELLED: 'CASH_RECEIPT_CANCELLED',
  REMITTANCE_CREATED: 'REMITTANCE_CREATED',
  REMITTANCE_SUBMITTED: 'REMITTANCE_SUBMITTED',
  REMITTANCE_VERIFIED: 'REMITTANCE_VERIFIED',
  REMITTANCE_REJECTED: 'REMITTANCE_REJECTED',
  REMITTANCE_DEPOSITED: 'REMITTANCE_DEPOSITED',
  RECEIPT_CREATED: 'RECEIPT_CREATED',
  RECEIPT_ISSUED: 'RECEIPT_ISSUED',
  RECEIPT_SENT: 'RECEIPT_SENT',
  RECEIPT_CANCELLED: 'RECEIPT_CANCELLED',
  NOTIFICATION_TEMPLATE_UPDATED: 'NOTIFICATION_TEMPLATE_UPDATED',
  NOTIFICATION_TEMPLATES_SEEDED: 'NOTIFICATION_TEMPLATES_SEEDED',
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
