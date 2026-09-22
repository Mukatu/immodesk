import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { toWebhookEventView, type WebhookEventRow, type WebhookEventView } from './webhook-views';

export interface WebhookPersistInput {
  organizationId: string | null;
  source: string;
  eventType: string;
  externalEventId: string;
  signatureHeader: string | null;
  signatureValid: boolean;
  requestPath: string;
  sourceIp: string | null;
  headers: Record<string, unknown>;
  rawPayload: unknown;
}

export interface WebhookListFilters {
  source?: string;
  status?: string;
  signatureValid?: boolean;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}

/**
 * `webhook_events` : persistance brute AVANT tout traitement (contrat
 * phase 4, § « Webhook »). L'écriture initiale et les mises à jour de statut
 * passent par le rôle d'administration : un webhook entrant n'a pas encore
 * d'organisation résolue avec certitude, donc pas de contexte RLS.
 */
@Injectable()
export class WebhookEventsService {
  private readonly logger = new Logger(WebhookEventsService.name);
  private admin: PrismaClient | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Insertion idempotente : renvoie `duplicate: true` sans rien modifier si
   * déjà vu. Exception : un événement NON signé déjà persisté ne bloque
   * jamais l'arrivée ultérieure du même `external_event_id` correctement
   * signé — sinon un tiers pourrait « réserver » à l'avance l'identifiant
   * d'une notification légitime et la faire ignorer. La ligne est alors
   * reprise (même `id`) et traitée normalement.
   */
  async persist(input: WebhookPersistInput): Promise<{ id: string; duplicate: boolean }> {
    const id = newId();
    const rows = await this.adminClient().$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO webhook_events (id, organization_id, source, event_type, status, external_event_id,
                                   signature_header, signature_valid, request_path, source_ip, headers, raw_payload)
       VALUES ($1::uuid, $2::uuid, $3::webhook_source, $4, 'RECEIVED', $5, $6, $7, $8, $9::inet, $10::jsonb, $11::jsonb)
       ON CONFLICT (source, external_event_id) DO UPDATE
         SET organization_id = coalesce(EXCLUDED.organization_id, webhook_events.organization_id),
             event_type = EXCLUDED.event_type,
             status = 'RECEIVED',
             signature_header = EXCLUDED.signature_header,
             signature_valid = true,
             request_path = EXCLUDED.request_path,
             source_ip = EXCLUDED.source_ip,
             headers = EXCLUDED.headers,
             raw_payload = EXCLUDED.raw_payload,
             error_message = NULL,
             updated_at = now()
         WHERE webhook_events.signature_valid = false AND EXCLUDED.signature_valid = true
       RETURNING id`,
      id,
      input.organizationId,
      input.source,
      input.eventType,
      input.externalEventId,
      input.signatureHeader,
      input.signatureValid,
      input.requestPath,
      input.sourceIp,
      JSON.stringify(input.headers ?? {}),
      JSON.stringify(input.rawPayload ?? {}),
    );
    if (rows.length === 0) {
      this.logger.debug(
        `Webhook en double ignoré : source=${input.source} event=${input.externalEventId}`,
      );
      return { id: '', duplicate: true };
    }
    // Ligne neuve, ou ligne non signée reprise : dans les deux cas c'est
    // l'identifiant rendu par la base qui fait foi.
    return { id: rows[0]?.id ?? id, duplicate: false };
  }

  async markStatus(
    id: string,
    status: 'PROCESSING' | 'PROCESSED' | 'IGNORED' | 'FAILED',
    extra?: { relatedEntityType?: string; relatedEntityId?: string; errorMessage?: string },
  ): Promise<void> {
    await this.adminClient().$executeRawUnsafe(
      `UPDATE webhook_events
          SET status = $2::webhook_status,
              processed_at = CASE WHEN $2 IN ('PROCESSED','IGNORED','FAILED') THEN now() ELSE processed_at END,
              processing_attempts = processing_attempts + 1,
              related_entity_type = coalesce($3, related_entity_type),
              related_entity_id = coalesce($4::uuid, related_entity_id),
              error_message = coalesce($5, error_message),
              updated_at = now()
        WHERE id = $1::uuid`,
      id,
      status,
      extra?.relatedEntityType ?? null,
      extra?.relatedEntityId ?? null,
      extra?.errorMessage ?? null,
    );
  }

  async list(
    organizationId: string,
    userId: string,
    filters: WebhookListFilters,
  ): Promise<Page<WebhookEventView>> {
    const conditions = ['w.organization_id = $1::uuid'];
    const params: unknown[] = [organizationId];
    const bind = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };
    if (filters.source) conditions.push(`w.source = ${bind(filters.source)}::webhook_source`);
    if (filters.status) conditions.push(`w.status = ${bind(filters.status)}::webhook_status`);
    if (filters.signatureValid !== undefined)
      conditions.push(`w.signature_valid = ${bind(filters.signatureValid)}`);
    if (filters.from) conditions.push(`w.received_at >= ${bind(filters.from)}::timestamptz`);
    if (filters.to) conditions.push(`w.received_at <= ${bind(filters.to)}::timestamptz`);

    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'w');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<WebhookEventRow[]>(
        `SELECT * FROM webhook_events w WHERE ${conditions.join(' AND ')} ${keysetOrderBy('w')} LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );
    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return { items: page.items.map(toWebhookEventView), pageInfo: page.pageInfo };
  }

  async get(organizationId: string, userId: string, id: string): Promise<WebhookEventRow> {
    const row = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<WebhookEventRow[]>(`SELECT * FROM webhook_events WHERE id = $1::uuid`, id),
    );
    if (!row[0]) throw new DomainError('WEBHOOKS.EVENT_NOT_FOUND', { webhookEventId: id });
    return row[0];
  }

  async logReplay(organizationId: string, actorUserId: string, id: string): Promise<void> {
    await this.prisma.withTenant(organizationId, actorUserId, (tx) =>
      audit(this.auditService, tx, {
        organizationId,
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.WEBHOOK_REPLAYED,
        entityType: 'webhook_events',
        entityId: id,
        newState: toJsonState({ replayed: true }),
      }),
    );
  }

  private adminClient(): PrismaClient {
    const adminUrl = this.config.get('DATABASE_ADMIN_URL');
    if (!adminUrl)
      throw new DomainError('PLATFORM.INTERNAL_ERROR', { reason: 'DATABASE_ADMIN_URL absent' });
    this.admin ??= new PrismaClient({ datasources: { db: { url: adminUrl } }, log: ['error'] });
    return this.admin;
  }
}
