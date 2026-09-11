import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { needsWebhookFallback, nextMessageStatus } from '../domain/delivery-rules';
import {
  SMS_PROVIDER,
  WHATSAPP_PROVIDER,
  type DeliveryEvent,
  type SmsProvider,
  type WhatsAppProvider,
} from '../domain/ports';
import { verifyGatewaySignature, webhookEventKey } from '../domain/webhook-parsing';
import { NotificationsWorker } from '../infrastructure/notifications.worker';
import type { NotificationPayload } from './notification-pipeline.service';

interface LogMatch {
  id: string;
  organization_id: string;
  notification_id: string | null;
  provider_message_id: string;
  channel: string;
}

const TIMESTAMP_COLUMN: Readonly<Record<string, string>> = {
  SENT: 'sent_at',
  DELIVERED: 'delivered_at',
  READ: 'read_at',
  FAILED: 'failed_at',
};

/**
 * Webhooks de statut WhatsApp (Meta) et SMS (passerelle Android).
 *
 * Un webhook arrive AVANT toute connaissance de l'organisation : le
 * message est retrouvé par son identifiant fournisseur, seule lecture
 * transverse, par la connexion d'administration (comme les crons). La mise à
 * jour du journal repasse ensuite par `withTenant`, donc par la RLS.
 * Idempotence : `webhook_events` porte l'empreinte SHA-256 du corps brut,
 * unique par source — un rejeu du fournisseur ne retraite rien.
 */
@Injectable()
export class WebhooksService implements OnModuleDestroy {
  private admin: PrismaClient | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly worker: NotificationsWorker,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsAppProvider,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.admin?.$disconnect();
    this.admin = null;
  }

  verifyChallenge(
    mode: string | undefined,
    token: string | undefined,
    challenge: string | undefined,
  ): string {
    if (mode !== 'subscribe' || token !== this.config.get('WHATSAPP_VERIFY_TOKEN') || !challenge) {
      throw new DomainError('WEBHOOKS.VERIFY_TOKEN_INVALID');
    }
    return challenge;
  }

  async ingestWhatsApp(
    rawBody: Buffer | undefined,
    signature: string | undefined,
    path: string,
  ): Promise<{ duplicate: boolean }> {
    const raw = rawBody ?? Buffer.alloc(0);
    if (!this.whatsapp.verifyWebhookSignature(raw, signature))
      throw new DomainError('WEBHOOKS.SIGNATURE_INVALID');
    const body = parse(raw);
    return this.ingest(
      'WHATSAPP_CLOUD',
      raw,
      body,
      this.whatsapp.parseWebhook(body),
      signature ?? null,
      path,
    );
  }

  async ingestSms(
    rawBody: Buffer | undefined,
    headers: { signature?: string; timestamp?: string; secret?: string },
    path: string,
  ): Promise<{ duplicate: boolean }> {
    const raw = rawBody ?? Buffer.alloc(0);
    if (!verifyGatewaySignature(raw, headers, this.config.get('SMS_GATEWAY_WEBHOOK_SECRET'))) {
      throw new DomainError('WEBHOOKS.SIGNATURE_INVALID');
    }
    const body = parse(raw);
    return this.ingest(
      'SMS_GATEWAY',
      raw,
      body,
      this.sms.parseDeliveryWebhook(body),
      headers.signature ?? null,
      path,
    );
  }

  private async ingest(
    source: 'WHATSAPP_CLOUD' | 'SMS_GATEWAY',
    raw: Buffer,
    body: unknown,
    events: DeliveryEvent[],
    signature: string | null,
    path: string,
  ): Promise<{ duplicate: boolean }> {
    const admin = this.adminClient();
    const ids = [...new Set(events.map((e) => e.providerMessageId))];
    const logs = ids.length
      ? await admin.$queryRawUnsafe<LogMatch[]>(
          `SELECT id, organization_id, notification_id, provider_message_id, channel::text AS channel
             FROM message_logs WHERE provider_message_id = ANY($1::text[])`,
          ids,
        )
      : [];
    const eventId = newId();
    const inserted = await admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO webhook_events (id, organization_id, source, event_type, status, external_event_id,
                                   signature_header, signature_valid, request_path, raw_payload,
                                   related_entity_type, related_entity_id)
       VALUES ($1::uuid, $2::uuid, $3::webhook_source, $4, 'PROCESSING', $5, $6, true, $7, $8::jsonb, 'message_log', $9::uuid)
       ON CONFLICT (source, external_event_id) DO NOTHING
       RETURNING id`,
      eventId,
      logs[0]?.organization_id ?? null,
      source,
      events[0]?.status ? `status.${events[0].status.toLowerCase()}` : 'unknown',
      webhookEventKey(raw),
      signature,
      path,
      JSON.stringify(body ?? {}),
      logs[0]?.id ?? null,
    );
    if (inserted.length === 0) return { duplicate: true };

    const fallbacks: Array<{ organizationId: string; notificationId: string }> = [];
    for (const event of events) {
      const log = logs.find((l) => l.provider_message_id === event.providerMessageId);
      if (!log) continue;
      const fallback = await this.apply(log, event);
      if (fallback) fallbacks.push(fallback);
    }
    await admin.$executeRawUnsafe(
      `UPDATE webhook_events SET status = 'PROCESSED', processed_at = now(), processing_attempts = 1 WHERE id = $1::uuid`,
      eventId,
    );
    for (const job of fallbacks) await this.worker.dispatch({ ...job, from: 'SMS' });
    return { duplicate: false };
  }

  /** Avance le statut du message ; rend la reprise SMS à planifier le cas échéant. */
  private async apply(
    log: LogMatch,
    event: DeliveryEvent,
  ): Promise<{ organizationId: string; notificationId: string } | null> {
    return this.prisma.withTenant(log.organization_id, null, async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ status: string }>>(
        `SELECT status::text AS status FROM message_logs WHERE id = $1::uuid FOR UPDATE`,
        log.id,
      );
      const next = rows[0] ? nextMessageStatus(rows[0].status, event.status) : null;
      if (next) {
        const column = TIMESTAMP_COLUMN[next];
        await tx.$executeRawUnsafe(
          `UPDATE message_logs
              SET status = $2::message_status,
                  ${column} = coalesce(${column}, $3::timestamptz),
                  error_code = CASE WHEN $2 = 'FAILED' THEN coalesce($4, error_code) ELSE error_code END,
                  error_message = CASE WHEN $2 = 'FAILED' THEN coalesce($5, error_message) ELSE error_message END,
                  raw_payload = raw_payload || jsonb_build_object('webhooks',
                                  coalesce(raw_payload -> 'webhooks', '[]'::jsonb) || $6::jsonb),
                  updated_at = now()
            WHERE id = $1::uuid`,
          log.id,
          next,
          event.occurredAt.toISOString(),
          event.errorCode ?? null,
          event.errorMessage ?? null,
          JSON.stringify([event.raw]),
        );
      }
      if (next !== 'FAILED' || !log.notification_id) return null;
      const notification = await tx.notifications.findFirst({
        where: { id: log.notification_id },
        select: { payload: true },
      });
      const smsAttempted = await tx.message_logs.count({
        where: { notification_id: log.notification_id, channel: 'SMS' },
      });
      const payload = notification?.payload as unknown as NotificationPayload | undefined;
      return needsWebhookFallback({
        eventStatus: next,
        channel: log.channel,
        order: payload?.channelOrder ?? [],
        smsAlreadyAttempted: smsAttempted > 0,
      })
        ? { organizationId: log.organization_id, notificationId: log.notification_id }
        : null;
    });
  }

  private adminClient(): PrismaClient {
    const adminUrl = this.config.get('DATABASE_ADMIN_URL');
    if (!adminUrl)
      throw new DomainError('PLATFORM.INTERNAL_ERROR', { reason: 'DATABASE_ADMIN_URL absent' });
    this.admin ??= new PrismaClient({ datasources: { db: { url: adminUrl } }, log: ['error'] });
    return this.admin;
  }
}

function parse(raw: Buffer): unknown {
  try {
    return raw.length > 0 ? JSON.parse(raw.toString('utf8')) : {};
  } catch {
    return {};
  }
}
