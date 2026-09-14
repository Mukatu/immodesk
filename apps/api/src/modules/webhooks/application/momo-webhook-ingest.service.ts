import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { MobileMoneyProviderRegistry } from '../../mobile-money/infrastructure/mobile-money-provider.registry';
import { MomoVerifyQueue } from '../../mobile-money/infrastructure/momo-verify.queue';
import { webhookBodyHash } from '../../mobile-money/domain/webhook-signature';
import type { RawWebhook } from '../../mobile-money/domain/ports';
import { WebhookEventsService } from './webhook-events.service';

type HeaderMap = Record<string, string | string[] | undefined>;

function headerValue(headers: HeaderMap, name: string): string | null {
  const value = headers[name];
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function parseJson(raw: Buffer): unknown {
  try {
    return raw.length > 0 ? JSON.parse(raw.toString('utf8')) : {};
  } catch {
    return {};
  }
}

/**
 * Réception des webhooks Mobile Money (contrat phase 4, § « Webhook ») :
 * persistance brute AVANT tout traitement, réponse en moins de 500 ms,
 * idempotence par `external_event_id`. Le nom du fournisseur n'est comparé
 * NULLE PART ici — `MobileMoneyProviderRegistry` (module `mobile-money`)
 * porte seul cette responsabilité.
 */
@Injectable()
export class MomoWebhookIngestService {
  private readonly logger = new Logger(MomoWebhookIngestService.name);
  private admin: PrismaClient | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly events: WebhookEventsService,
    private readonly registry: MobileMoneyProviderRegistry,
    private readonly verifyQueue: MomoVerifyQueue,
  ) {}

  async ingest(
    providerParam: string,
    rawBody: Buffer,
    headers: HeaderMap,
    sourceIp: string | null,
    requestPath: string,
  ): Promise<void> {
    const provider = this.registry.forCode(providerParam);
    const body = parseJson(rawBody);
    const raw: RawWebhook = { headers, body, rawBody };
    const signatureValid = provider.verifyWebhook(raw);
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
    const signatureHeader = headerValue(
      headers,
      provider.code === 'CINETPAY' ? 'x-token' : 'x-simulator-signature',
    );

    const { id, duplicate } = await this.events.persist({
      organizationId,
      source,
      eventType: `momo.${(state ?? 'unknown').toLowerCase()}`,
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
      await this.events.markStatus(id, 'IGNORED', {
        errorMessage: 'MOMO.WEBHOOK_SIGNATURE_INVALID',
      });
      this.logger.warn(`MOMO.WEBHOOK_SIGNATURE_INVALID provider=${providerParam} event=${id}`);
      return;
    }
    if (!organizationId || !merchantReference) {
      await this.events.markStatus(id, 'FAILED', {
        errorMessage: 'Référence marchande introuvable.',
      });
      return;
    }

    await this.events.markStatus(id, 'PROCESSING');
    const transaction = await this.prisma.withTenant(organizationId, null, (tx) =>
      tx.mobile_money_transactions.findFirst({
        where: { merchant_reference: merchantReference as string },
        select: { id: true },
      }),
    );
    if (!transaction) {
      await this.events.markStatus(id, 'FAILED', {
        errorMessage: 'Transaction Mobile Money introuvable.',
      });
      return;
    }
    await this.verifyQueue.enqueue({ organizationId, transactionId: transaction.id });
    await this.events.markStatus(id, 'PROCESSED', {
      relatedEntityType: 'mobile_money_transactions',
      relatedEntityId: transaction.id,
    });
  }

  /**
   * Rejeu (`POST /v1/webhook-events/{id}/replay`, OWNER) : reprend le
   * traitement à partir du corps déjà persisté, sans revérifier la
   * signature (l'événement est déjà de confiance — c'est un OWNER qui agit,
   * pas le fournisseur). Idempotent : si la transaction est déjà au repos,
   * `momo:verify-status` ne fait rien de plus.
   */
  async replay(organizationId: string, userId: string, id: string): Promise<void> {
    const row = await this.events.get(organizationId, userId, id);
    const body = row.raw_payload as Record<string, unknown>;
    const merchantReference =
      row.source === 'CINETPAY'
        ? (body.cpm_trans_id as string | undefined)
        : (body.merchantReference as string | undefined);
    if (!merchantReference) {
      await this.events.markStatus(id, 'FAILED', {
        errorMessage: 'Référence marchande introuvable au rejeu.',
      });
      return;
    }
    const transaction = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.mobile_money_transactions.findFirst({
        where: { merchant_reference: merchantReference },
        select: { id: true },
      }),
    );
    await this.events.markStatus(id, 'PROCESSING');
    if (!transaction) {
      await this.events.markStatus(id, 'FAILED', {
        errorMessage: 'Transaction Mobile Money introuvable au rejeu.',
      });
      return;
    }
    await this.verifyQueue.enqueue({ organizationId, transactionId: transaction.id });
    await this.events.markStatus(id, 'PROCESSED', {
      relatedEntityType: 'mobile_money_transactions',
      relatedEntityId: transaction.id,
    });
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
