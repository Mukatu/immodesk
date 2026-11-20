import { Injectable, Logger } from '@nestjs/common';
import type { PrismaClient } from '../../../generated/prisma/client';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { MomoPurposeRouter } from '../../mobile-money/application/momo-purpose-router';
import type { MomoPurpose } from '../../mobile-money/domain/momo-purpose';
import type { ParsedWebhook, RawWebhook } from '../../mobile-money/domain/ports';
import { webhookBodyHash } from '../../mobile-money/domain/webhook-signature';
import { MobileMoneyProviderRegistry } from '../../mobile-money/infrastructure/mobile-money-provider.registry';
import {
  MOMO_WEBHOOK_AMBIGUOUS,
  MOMO_WEBHOOK_PAYLOAD_INVALID,
  MOMO_WEBHOOK_PROVIDER_MISMATCH,
  MOMO_WEBHOOK_PURPOSE_NOT_ROUTED,
  MOMO_WEBHOOK_UNRESOLVED,
  resolveMomoExternalReference,
} from '../../mobile-money/infrastructure/momo-reference-resolver';
import { WebhookEventsService } from './webhook-events.service';
import { headerValue, parseJson, type HeaderMap } from './webhook-request';

/**
 * Réception UNIQUE des webhooks Mobile Money (loyers, abonnements,
 * reversements), contrat phase 4 : réponse en moins de 500 ms, idempotence
 * par `external_event_id`, rattachement par `external_reference` seulement.
 *
 * Ordre : 1) signature, EN PREMIER (un webhook non signé n'est ni analysé,
 * ni rattaché à une organisation, ni conservé : empreinte et taille
 * seulement) ; 2) analyse du corps ; 3) résolution de la transaction ;
 * 4) routage par `purpose` (`MomoPurposeRouter`), jamais par l'URL appelée.
 */
@Injectable()
export class MomoWebhookIngestService {
  private readonly logger = new Logger(MomoWebhookIngestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: WebhookEventsService,
    private readonly registry: MobileMoneyProviderRegistry,
    private readonly router: MomoPurposeRouter,
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

    if (!provider.verifyWebhook(raw)) {
      const bodySha256 = webhookBodyHash(rawBody);
      await this.events.persistUnsigned({
        source: provider.webhookSource,
        requestPath,
        sourceIp,
        bodySha256,
        bodyBytes: rawBody.length,
        userAgent: headerValue(headers, 'user-agent'),
      });
      this.logger.warn(
        `MOMO.WEBHOOK_SIGNATURE_INVALID provider=${providerParam} ip=${sourceIp ?? '-'} sha256=${bodySha256}`,
      );
      return;
    }

    const persistBase = {
      source: provider.webhookSource,
      signatureHeader: headerValue(headers, provider.signatureHeader),
      signatureValid: true,
      requestPath,
      sourceIp,
      headers: Object.fromEntries(Object.entries(headers).filter(([k]) => !k.startsWith(':'))),
      rawPayload: body,
    };

    let parsed: ParsedWebhook;
    try {
      parsed = provider.parseWebhook(raw);
    } catch {
      const { id, duplicate } = await this.events.persist({
        ...persistBase,
        organizationId: null,
        eventType: 'momo.unknown',
        externalEventId: webhookBodyHash(rawBody),
      });
      if (!duplicate) {
        await this.events.markStatus(id, 'FAILED', { errorMessage: MOMO_WEBHOOK_PAYLOAD_INVALID });
      }
      return;
    }

    const resolution = parsed.externalReference
      ? await resolveMomoExternalReference(this.adminClient(), parsed.externalReference)
      : ({ kind: 'UNKNOWN' } as const);
    // Seul un rattachement certain renseigne l'organisation : un événement
    // ambigu reste SANS organisation et est mis de côté pour la revue plateforme.
    const resolved = resolution.kind === 'RESOLVED' ? resolution : null;
    const prefix = resolved?.purpose === 'SUBSCRIPTION' ? 'subscription.momo' : 'momo';

    const { id, duplicate } = await this.events.persist({
      ...persistBase,
      organizationId: resolved?.organizationId ?? null,
      eventType: `${prefix}.${parsed.state.toLowerCase()}`,
      externalEventId: parsed.eventId ?? webhookBodyHash(rawBody),
    });
    if (duplicate) return;

    if (!resolved) {
      // Échec fermé : jamais de confirmation pour une organisation devinée.
      const ambiguous = resolution.kind === 'AMBIGUOUS';
      await this.events.markStatus(id, 'FAILED', {
        errorMessage: ambiguous ? MOMO_WEBHOOK_AMBIGUOUS : MOMO_WEBHOOK_UNRESOLVED,
      });
      if (resolution.kind === 'AMBIGUOUS') {
        this.logger.warn(
          `${MOMO_WEBHOOK_AMBIGUOUS} provider=${providerParam} event=${id} candidates=${resolution.candidates}`,
        );
      }
      return;
    }
    if (resolved.aggregator && resolved.aggregator.toUpperCase() !== provider.code) {
      await this.events.markStatus(id, 'FAILED', {
        relatedEntityType: 'mobile_money_transactions',
        relatedEntityId: resolved.transactionId,
        errorMessage: MOMO_WEBHOOK_PROVIDER_MISMATCH,
      });
      return;
    }
    await this.dispatch(id, resolved.organizationId, resolved.transactionId, resolved.purpose);
  }

  /**
   * Rejeu (`POST /v1/webhook-events/{id}/replay`, OWNER) : reprend le
   * traitement à partir du corps déjà persisté. Réservé aux événements
   * SIGNÉS : un événement non signé n'a jamais été de confiance. Idempotent.
   */
  async replay(organizationId: string, userId: string, id: string): Promise<void> {
    const row = await this.events.get(organizationId, userId, id);
    if (!row.signature_valid) {
      throw new DomainError('WEBHOOKS.REPLAY_NOT_ALLOWED', { webhookEventId: id });
    }
    let externalReference: string;
    try {
      externalReference = this.registry.forWebhookSource(row.source).parseWebhook({
        headers: {},
        body: row.raw_payload,
        rawBody: Buffer.alloc(0),
      }).externalReference;
    } catch {
      await this.events.markStatus(id, 'FAILED', { errorMessage: MOMO_WEBHOOK_PAYLOAD_INVALID });
      return;
    }
    // Recherche bornée par la RLS de l'OWNER.
    const transaction = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.mobile_money_transactions.findFirst({
        where: { external_reference: externalReference },
        select: { id: true, purpose: true },
      }),
    );
    if (!transaction) {
      await this.events.markStatus(id, 'FAILED', {
        errorMessage: 'Transaction Mobile Money introuvable au rejeu.',
      });
      return;
    }
    await this.dispatch(id, organizationId, transaction.id, transaction.purpose);
  }

  private async dispatch(
    eventId: string,
    organizationId: string,
    transactionId: string,
    purpose: MomoPurpose,
  ): Promise<void> {
    const related = {
      relatedEntityType: 'mobile_money_transactions',
      relatedEntityId: transactionId,
    };
    const handler = this.router.handlerFor(purpose);
    if (!handler) {
      this.logger.warn(`${MOMO_WEBHOOK_PURPOSE_NOT_ROUTED} event=${eventId} purpose=${purpose}`);
      await this.events.markStatus(eventId, 'FAILED', {
        ...related,
        errorMessage: MOMO_WEBHOOK_PURPOSE_NOT_ROUTED,
      });
      return;
    }
    await this.events.markStatus(eventId, 'PROCESSING');
    await handler.enqueueVerify(organizationId, transactionId);
    await this.events.markStatus(eventId, 'PROCESSED', related);
  }

  private adminClient(): PrismaClient {
    const admin = this.prisma.adminClient();
    if (!admin)
      throw new DomainError('PLATFORM.INTERNAL_ERROR', { reason: 'DATABASE_ADMIN_URL absent' });
    return admin;
  }
}
