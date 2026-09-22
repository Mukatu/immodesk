import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { webhookBodyHash } from '../../mobile-money/domain/webhook-signature';
import type { RawWebhook } from '../../mobile-money/domain/ports';
import { MobileMoneyProviderRegistry } from '../../mobile-money/infrastructure/mobile-money-provider.registry';
import { SubscriptionPaymentsService } from './subscription-payments.service';

type HeaderMap = Record<string, string | string[] | undefined>;

function parseJson(raw: Buffer): unknown {
  try {
    return raw.length > 0 ? JSON.parse(raw.toString('utf8')) : {};
  } catch {
    return {};
  }
}

/**
 * `POST /v1/webhooks/mobile-money/subscription` (contrat phase 10, livrable 6) :
 * même principe que `webhooks/application/momo-webhook-ingest.service.ts`
 * (persistance brute AVANT tout traitement, idempotence par
 * `external_event_id`), réimplémenté ICI plutôt qu'importé : `subscriptions`
 * n'importe jamais `webhooks`, précisément pour que sa route s'enregistre
 * AVANT la route générique `POST /webhooks/mobile-money/:provider` (voir le
 * commentaire d'ordre d'import dans `app.module.ts`). La table
 * `webhook_events` reste partagée — seule l'écriture est dupliquée, à
 * l'identique du dépôt existant.
 *
 * Le fournisseur PLATEFORME est toujours celui de `MOMO_PROVIDER_DEFAULT` :
 * il n'y a pas de segment `{provider}` dans cette URL, l'agrégateur des
 * abonnements étant un choix de plateforme, pas d'organisation.
 *
 * Comme en phase 4 : le webhook ne confirme JAMAIS seul — il ne fait que
 * déclencher une ré-interrogation immédiate (`SubscriptionPaymentsService
 * .verifyStatus`), qui seule peut faire passer une facture à PAID.
 */
@Injectable()
export class SubscriptionWebhookIngestService {
  private readonly logger = new Logger(SubscriptionWebhookIngestService.name);
  private admin: PrismaClient | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly registry: MobileMoneyProviderRegistry,
    private readonly payments: SubscriptionPaymentsService,
  ) {}

  async ingest(
    rawBody: Buffer,
    headers: HeaderMap,
    sourceIp: string | null,
    requestPath: string,
  ): Promise<void> {
    const provider = this.registry.forCode(this.config.get('MOMO_PROVIDER_DEFAULT'));
    const body = parseJson(rawBody);
    const raw: RawWebhook = { headers, body, rawBody };
    const signatureValid = provider.verifyWebhook(raw);
    const signatureHeader = this.headerValue(
      headers,
      provider.code === 'CINETPAY' ? 'x-token' : 'x-simulator-signature',
    );

    let merchantReference: string | null = null;
    let state: string | null = null;
    let eventId: string | undefined;
    try {
      const parsed = provider.parseWebhook(raw);
      merchantReference = parsed.merchantReference;
      state = parsed.state;
      eventId = parsed.eventId;
    } catch {
      // Corps illisible : persisté quand même, pour l'expertise en cas de litige.
    }

    const organizationId = merchantReference
      ? await this.resolveOrganization(merchantReference)
      : null;
    const source = provider.code === 'CINETPAY' ? 'CINETPAY' : 'OTHER';

    const { id, duplicate } = await this.persist({
      organizationId,
      source,
      eventType: `subscription.momo.${(state ?? 'unknown').toLowerCase()}`,
      externalEventId: eventId ?? webhookBodyHash(rawBody),
      signatureHeader,
      signatureValid,
      requestPath,
      sourceIp,
      headers: Object.fromEntries(Object.entries(headers).filter(([k]) => !k.startsWith(':'))),
      rawPayload: body,
    });
    if (duplicate) return;

    if (!signatureValid) {
      await this.markStatus(id, 'IGNORED', 'SUBSCRIPTIONS.WEBHOOK_SIGNATURE_INVALID');
      this.logger.warn(`SUBSCRIPTIONS.WEBHOOK_SIGNATURE_INVALID event=${id}`);
      return;
    }
    if (!organizationId || !merchantReference) {
      await this.markStatus(id, 'FAILED', 'Référence marchande introuvable.');
      return;
    }
    const transaction = await this.adminClient().mobile_money_transactions.findFirst({
      where: { merchant_reference: merchantReference, organization_id: organizationId },
      select: { id: true },
    });
    if (!transaction) {
      await this.markStatus(id, 'FAILED', 'Transaction Mobile Money introuvable.');
      return;
    }
    await this.markStatus(id, 'PROCESSING');
    await this.payments.verifyStatus(organizationId, transaction.id);
    await this.markStatus(id, 'PROCESSED', undefined, 'mobile_money_transactions', transaction.id);
  }

  private headerValue(headers: HeaderMap, name: string): string | null {
    const value = headers[name];
    return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
  }

  private async persist(input: {
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
  }): Promise<{ id: string; duplicate: boolean }> {
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
    // Même règle que `WebhookEventsService.persist` : un événement non signé
    // déjà vu ne bloque jamais sa version signée, qui reprend la ligne.
    return rows.length === 0
      ? { id: '', duplicate: true }
      : { id: rows[0]?.id ?? id, duplicate: false };
  }

  private async markStatus(
    id: string,
    status: 'PROCESSING' | 'PROCESSED' | 'IGNORED' | 'FAILED',
    errorMessage?: string,
    relatedEntityType?: string,
    relatedEntityId?: string,
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
      relatedEntityType ?? null,
      relatedEntityId ?? null,
      errorMessage ?? null,
    );
  }

  private async resolveOrganization(merchantReference: string): Promise<string | null> {
    const rows = await this.adminClient().$queryRawUnsafe<Array<{ organization_id: string }>>(
      `SELECT organization_id FROM mobile_money_transactions WHERE merchant_reference = $1 LIMIT 1`,
      merchantReference,
    );
    return rows[0]?.organization_id ?? null;
  }

  private adminClient(): PrismaClient {
    const adminUrl = this.config.get('DATABASE_ADMIN_URL');
    if (!adminUrl)
      throw new DomainError('PLATFORM.INTERNAL_ERROR', { reason: 'DATABASE_ADMIN_URL absent' });
    this.admin ??= new PrismaClient({ datasources: { db: { url: adminUrl } }, log: ['error'] });
    return this.admin;
  }
}
