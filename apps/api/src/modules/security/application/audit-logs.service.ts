import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface AuditLogFilters {
  actorUserId?: string;
  entityType?: string;
  entityId?: string;
  operation?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}

export interface AuditLogEntryView {
  id: string;
  occurredAt: string;
  action: string;
  operation: string;
  entityType: string;
  entityId: string;
  actorUserId: string | null;
  actorLabel: string | null;
  actorRole: string | null;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  changedFields: string[];
  ipAddress: string | null;
  requestId: string | null;
}

interface AuditLogRow {
  id: string;
  created_at: Date;
  occurred_at: Date;
  action: string;
  reason: string | null;
  entity_type: string;
  entity_id: string;
  actor_user_id: string | null;
  actor_label: string | null;
  actor_role: string | null;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  changed_fields: string[] | null;
  ip_address: string | null;
  request_id: string | null;
}

/** Valeurs exactes de l'énumération `audit_action` (contrat phase 11, § Énumérations). */
const AUDIT_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'STATE_TRANSITION',
  'LOGIN',
  'EXPORT',
  'IMPORT',
  'ACCESS_DENIED',
];

/**
 * Consultation de `audit_logs` (`GET /v1/organizations/{id}/audit-logs`),
 * réservée à OWNER. Aucune écriture ici : `audit_logs` est strictement
 * append-only et alimentée par `AuditService` (module `audit`), jamais par
 * ce module.
 */
@Injectable()
export class AuditLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async list(
    organizationId: string,
    userId: string,
    filters: AuditLogFilters,
  ): Promise<Page<AuditLogEntryView>> {
    const conditions = ['al.organization_id = $1::uuid'];
    const params: unknown[] = [organizationId];
    const bind = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };

    if (filters.actorUserId)
      conditions.push(`al.actor_user_id = ${bind(filters.actorUserId)}::uuid`);
    if (filters.entityType) conditions.push(`al.entity_type = ${bind(filters.entityType)}`);
    if (filters.entityId) conditions.push(`al.entity_id = ${bind(filters.entityId)}::uuid`);
    // `operation` (nom métier fin) est porté par la colonne `reason` (voir
    // `audit/domain/audit-entry.ts`), pas par une colonne dédiée.
    if (filters.operation) conditions.push(`al.reason = ${bind(filters.operation)}`);
    if (filters.action && AUDIT_ACTIONS.includes(filters.action)) {
      conditions.push(`al.action = ${bind(filters.action)}::audit_action`);
    }
    if (filters.from) conditions.push(`al.occurred_at >= ${bind(filters.from)}::timestamptz`);
    if (filters.to) conditions.push(`al.occurred_at <= ${bind(filters.to)}::timestamptz`);

    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'al');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }

    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<AuditLogRow[]>(
        `SELECT al.id, al.created_at, al.occurred_at, al.action::text AS action, al.reason,
                al.entity_type, al.entity_id, al.actor_user_id, al.actor_label,
                al.actor_role::text AS actor_role, al.previous_state, al.new_state,
                al.changed_fields, al.ip_address, al.request_id
         FROM audit_logs al
         WHERE ${conditions.join(' AND ')}
         ${keysetOrderBy('al')}
         LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );
    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return { items: page.items.map(toView), pageInfo: page.pageInfo };
  }
}

function toView(row: AuditLogRow): AuditLogEntryView {
  const state = (row.new_state ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    occurredAt: row.occurred_at.toISOString(),
    action: row.action,
    operation: row.reason ?? (typeof state.operation === 'string' ? state.operation : ''),
    entityType: row.entity_type,
    entityId: row.entity_id,
    actorUserId: row.actor_user_id,
    actorLabel: row.actor_label,
    actorRole: row.actor_role,
    previousState: row.previous_state,
    newState: row.new_state,
    changedFields: row.changed_fields ?? [],
    ipAddress: row.ip_address,
    requestId: row.request_id,
  };
}
