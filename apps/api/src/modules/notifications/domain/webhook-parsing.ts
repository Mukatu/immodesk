import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { DeliveryEvent } from './ports';

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Clé d'idempotence d'un appel de webhook : SHA-256 du corps brut. */
export function webhookEventKey(rawBody: Buffer): string {
  return createHash('sha256').update(rawBody).digest('hex');
}

/**
 * Signature Meta `X-Hub-Signature-256: sha256=<hex>`, HMAC-SHA256 du corps
 * BRUT avec le secret d'application. Comparaison en temps constant.
 */
export function verifyMetaSignature(
  rawBody: Buffer,
  header: string | undefined,
  appSecret: string,
): boolean {
  if (!header || !header.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  return safeEqual(header.slice('sha256='.length), expected);
}

const META_STATUSES: Readonly<Record<string, DeliveryEvent['status']>> = {
  sent: 'SENT',
  delivered: 'DELIVERED',
  read: 'READ',
  failed: 'FAILED',
};

/** `entry[].changes[].value.statuses[]` de la Cloud API → évènements normalisés. */
export function parseMetaStatuses(body: unknown): DeliveryEvent[] {
  const events: DeliveryEvent[] = [];
  const entries = (body as { entry?: unknown[] })?.entry ?? [];
  for (const entry of Array.isArray(entries) ? entries : []) {
    for (const change of ((entry as { changes?: unknown[] }).changes ?? []) as Array<
      Record<string, any>
    >) {
      for (const status of (change?.value?.statuses ?? []) as Array<Record<string, any>>) {
        const mapped = META_STATUSES[String(status?.status)];
        if (!mapped || typeof status?.id !== 'string') continue;
        const error = Array.isArray(status.errors) ? status.errors[0] : undefined;
        const seconds = Number(status.timestamp);
        events.push({
          providerMessageId: status.id,
          status: mapped,
          occurredAt: Number.isFinite(seconds) ? new Date(seconds * 1000) : new Date(),
          errorCode: error?.code !== undefined ? String(error.code) : null,
          errorMessage: error?.title ?? error?.message ?? null,
          raw: status,
        });
      }
    }
  }
  return events;
}

/**
 * Signature de SMS Gateway for Android : `X-Signature` = HMAC-SHA256 hexa de
 * `corps + X-Timestamp` avec la clé partagée, horodatage à ± 5 minutes
 * (anti-rejeu). Une passerelle configurée par secret d'URL peut à défaut
 * présenter `X-Webhook-Secret`, comparé en temps constant.
 */
export function verifyGatewaySignature(
  rawBody: Buffer,
  headers: { signature?: string; timestamp?: string; secret?: string },
  sharedSecret: string,
  now: Date = new Date(),
): boolean {
  if (headers.secret) return safeEqual(headers.secret, sharedSecret);
  if (!headers.signature || !headers.timestamp) return false;
  const seconds = Number(headers.timestamp);
  if (!Number.isFinite(seconds) || Math.abs(now.getTime() / 1000 - seconds) > 300) return false;
  const expected = createHmac('sha256', sharedSecret)
    .update(Buffer.concat([rawBody, Buffer.from(headers.timestamp)]))
    .digest('hex');
  return safeEqual(headers.signature.toLowerCase(), expected);
}

const GATEWAY_EVENTS: Readonly<Record<string, DeliveryEvent['status']>> = {
  'sms:sent': 'SENT',
  'sms:delivered': 'DELIVERED',
  'sms:failed': 'FAILED',
};

/** Corps `{ event, payload: { messageId, ... } }` de la passerelle → évènements normalisés. */
export function parseGatewayEvents(body: unknown): DeliveryEvent[] {
  const record = body as { event?: string; payload?: Record<string, any> } | null;
  const mapped = record?.event ? GATEWAY_EVENTS[record.event] : undefined;
  const payload = record?.payload ?? {};
  if (!mapped || typeof payload.messageId !== 'string') return [];
  const at = payload.deliveredAt ?? payload.sentAt ?? payload.failedAt;
  return [
    {
      providerMessageId: payload.messageId,
      status: mapped,
      occurredAt: at ? new Date(at) : new Date(),
      errorCode: mapped === 'FAILED' ? 'GATEWAY_FAILED' : null,
      errorMessage: payload.reason ?? null,
      raw: record as Record<string, unknown>,
    },
  ];
}
