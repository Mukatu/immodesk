import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { smsSegments } from '../domain/delivery-rules';
import type { DeliveryEvent, OutboundMessage, SendResult, SmsProvider } from '../domain/ports';
import { parseGatewayEvents } from '../domain/webhook-parsing';

/**
 * Passerelle SMS open source « SMS Gateway for Android » : un téléphone
 * Android dédié, une SIM MTN au forfait SMS illimité (décision du
 * 10 septembre 2026).
 *
 * `POST {SMS_GATEWAY_URL}/message` en authentification Basic, corps
 * `{ message, phoneNumbers }`. La passerelle répond aussitôt « en attente »
 * (le téléphone émet ensuite) : l'envoi est journalisé QUEUED, puis les
 * webhooks `sms:sent` / `sms:delivered` / `sms:failed` font avancer le statut.
 * Aucune dépendance au fournisseur hors de ce fichier : une passerelle
 * commerciale se branchera derrière la même interface `SmsProvider`.
 */
@Injectable()
export class AndroidGatewaySmsProvider implements SmsProvider {
  readonly name = 'android-gateway';
  private readonly logger = new Logger(AndroidGatewaySmsProvider.name);

  constructor(private readonly config: AppConfigService) {}

  async send(message: OutboundMessage): Promise<SendResult> {
    const base = (this.config.get('SMS_GATEWAY_URL') ?? '').replace(/\/+$/, '');
    const url = base.endsWith('/message') ? base : `${base}/message`;
    const credentials = Buffer.from(
      `${this.config.get('SMS_GATEWAY_USERNAME') ?? ''}:${this.config.get('SMS_GATEWAY_PASSWORD') ?? ''}`,
    ).toString('base64');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.body, phoneNumbers: [message.to] }),
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => ({}))) as Record<string, any>;
      if (response.ok && typeof payload?.id === 'string') {
        const state = String(payload.state ?? 'Pending');
        return {
          providerMessageId: payload.id,
          provider: this.name,
          segments: smsSegments(message.body),
          costAmount: 0n,
          status:
            state === 'Failed'
              ? 'FAILED'
              : state === 'Sent' || state === 'Delivered'
                ? 'SENT'
                : 'QUEUED',
          raw: payload,
        };
      }
      return {
        providerMessageId: null,
        provider: this.name,
        segments: smsSegments(message.body),
        costAmount: 0n,
        status: 'FAILED',
        errorCode: `HTTP_${response.status}`,
        errorMessage: payload?.message ?? `Réponse HTTP ${response.status} de la passerelle`,
        raw: payload,
      };
    } catch (error) {
      this.logger.warn(`Passerelle SMS injoignable : ${(error as Error).message}`);
      return {
        providerMessageId: null,
        provider: this.name,
        segments: smsSegments(message.body),
        costAmount: 0n,
        status: 'FAILED',
        errorCode: 'NETWORK_ERROR',
        errorMessage: (error as Error).message,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  parseDeliveryWebhook(body: unknown): DeliveryEvent[] {
    return parseGatewayEvents(body);
  }
}
