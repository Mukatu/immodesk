import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { clampDenialWindow } from '../domain/security-policy';

export interface AccessDenialFilters {
  from?: string;
  to?: string;
  userId?: string;
  code?: string;
  limit?: number;
  cursor?: string;
}

export interface AccessDenialView {
  occurredAt: string;
  actorUserId: string | null;
  actorLabel: string | null;
  apiKeyId: string | null;
  ipAddress: string | null;
  method: string;
  path: string;
  code: string;
  entityType: string;
  entityId: string;
  requestId: string | null;
}

interface AccessDenialRow {
  id: string;
  created_at: Date;
  occurred_at: Date;
  actor_user_id: string | null;
  actor_label: string | null;
  api_key_id: string | null;
  ip_address: string | null;
  entity_type: string;
  entity_id: string;
  request_id: string | null;
  new_state: Record<string, unknown> | null;
}

/**
 * Journal des accès refusés (`audit_logs.action = 'ACCESS_DENIED'`) : lecture
 * seule, aucune table propre (contrat, § Centre de sécurité). La fenêtre est
 * bornée par `SECURITY_DENIAL_LOOKBACK_DAYS`, au-delà l'archive froide
 * (arbitrage 16) est hors du périmètre de cette route.
 */
@Injectable()
export class AccessDenialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async list(
    organizationId: string,
    userId: string,
    filters: AccessDenialFilters,
  ): Promise<Page<AccessDenialView>> {
    const now = new Date();
    const window = clampDenialWindow(
      {
        from: filters.from ? new Date(filters.from) : undefined,
        to: filters.to ? new Date(filters.to) : undefined,
      },
      now,
      this.config.get('SECURITY_DENIAL_LOOKBACK_DAYS'),
    );

    const conditions = [
      'al.organization_id = $1::uuid',
      "al.action = 'ACCESS_DENIED'",
      'al.occurred_at >= $2::timestamptz',
      'al.occurred_at <= $3::timestamptz',
    ];
    const params: unknown[] = [organizationId, window.from.toISOString(), window.to.toISOString()];
    const bind = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };
    if (filters.userId) conditions.push(`al.actor_user_id = ${bind(filters.userId)}::uuid`);
    if (filters.code) conditions.push(`al.new_state ->> 'code' = ${bind(filters.code)}`);

    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'al');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }

    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<AccessDenialRow[]>(
        `SELECT al.id, al.created_at, al.occurred_at, al.actor_user_id, al.actor_label,
                al.api_key_id, al.ip_address, al.entity_type, al.entity_id,
                al.request_id, al.new_state
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

function toView(row: AccessDenialRow): AccessDenialView {
  const state = (row.new_state ?? {}) as Record<string, unknown>;
  return {
    occurredAt: row.occurred_at.toISOString(),
    actorUserId: row.actor_user_id,
    actorLabel: row.actor_label,
    apiKeyId: row.api_key_id,
    ipAddress: row.ip_address,
    method: typeof state.method === 'string' ? state.method : '',
    path: typeof state.path === 'string' ? state.path : '',
    code: typeof state.code === 'string' ? state.code : '',
    entityType: row.entity_type,
    entityId: row.entity_id,
    requestId: row.request_id,
  };
}
