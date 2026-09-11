import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { newId } from '../../../shared/ids/uuid';
import type {
  DeliveryEvent,
  DocumentMessage,
  OutboundMessage,
  SendResult,
  SmsProvider,
  TemplateMessage,
  WhatsAppProvider,
} from '../domain/ports';
import {
  parseGatewayEvents,
  parseMetaStatuses,
  verifyMetaSignature,
} from '../domain/webhook-parsing';
import { smsSegments } from '../domain/delivery-rules';

/**
 * Échec simulé : tout numéro finissant par `99` est refusé, par WhatsApp
 * comme par SMS (contrat de la phase 3). Permet d'éprouver le repli et le
 * journal d'échec sans fournisseur réel.
 */
export function isSimulatedFailure(to: string): boolean {
  return to.replace(/\D/g, '').endsWith('99');
}

/**
 * Passerelle SMS de développement : n'envoie rien, journalise le message
 * (code OTP compris) pour permettre les essais locaux et les tests
 * d'intégration.
 */
@Injectable()
export class FakeSmsProvider implements SmsProvider {
  readonly name = 'fake-sms';
  private readonly logger = new Logger(FakeSmsProvider.name);

  /** Dernier message émis — même en échec simulé, pour les tests d'OTP. */
  private lastMessage: (OutboundMessage & { sentAt: Date }) | null = null;
  readonly sent: Array<
    OutboundMessage & { sentAt: Date; providerMessageId: string | null; failed: boolean }
  > = [];

  async send(message: OutboundMessage): Promise<SendResult> {
    this.lastMessage = { ...message, sentAt: new Date() };
    const failed = isSimulatedFailure(message.to);
    const providerMessageId = failed ? null : `fake-sms-${newId()}`;
    this.sent.push({ ...message, sentAt: new Date(), providerMessageId, failed });
    this.logger.log(`[SMS SIMULÉ${failed ? ' — ÉCHEC' : ''}] vers ${message.to} : ${message.body}`);
    if (failed) {
      return {
        providerMessageId: null,
        provider: this.name,
        segments: smsSegments(message.body),
        costAmount: 0n,
        status: 'FAILED',
        errorCode: 'SIMULATED_FAILURE',
        errorMessage: 'Échec simulé : numéro finissant par 99.',
        raw: { simulated: true, to: message.to },
      };
    }
    return {
      providerMessageId,
      provider: this.name,
      segments: smsSegments(message.body),
      costAmount: 0n,
      status: 'SENT',
      raw: { simulated: true, to: message.to },
    };
  }

  parseDeliveryWebhook(body: unknown): DeliveryEvent[] {
    return parseGatewayEvents(body);
  }

  /** Lecture du dernier message simulé (tests uniquement). */
  peekLastMessage(): (OutboundMessage & { sentAt: Date }) | null {
    return this.lastMessage;
  }
}

/**
 * Passerelle WhatsApp de développement : mêmes réponses que la Cloud API
 * (identifiant `wamid.*`, erreur 131026 pour un numéro sans WhatsApp), mêmes
 * webhooks et même signature, sans aucun appel réseau.
 */
@Injectable()
export class FakeWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'fake-whatsapp';
  private readonly logger = new Logger(FakeWhatsAppProvider.name);
  readonly sent: Array<{
    to: string;
    kind: 'TEXT' | 'TEMPLATE' | 'DOCUMENT';
    text: string;
    providerMessageId: string | null;
    document: string | null;
  }> = [];

  constructor(private readonly config: AppConfigService) {}

  async send(message: OutboundMessage): Promise<SendResult> {
    return this.simulate(message.to, 'TEXT', message.body, null);
  }

  async sendTemplate(message: TemplateMessage): Promise<SendResult> {
    return this.simulate(
      message.to,
      'TEMPLATE',
      message.previewText,
      message.document?.link ?? null,
      message.templateName,
    );
  }

  async sendDocument(message: DocumentMessage): Promise<SendResult> {
    return this.simulate(message.to, 'DOCUMENT', message.caption ?? message.filename, message.link);
  }

  parseWebhook(body: unknown): DeliveryEvent[] {
    return parseMetaStatuses(body);
  }

  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
    return verifyMetaSignature(rawBody, signatureHeader, this.config.get('WHATSAPP_APP_SECRET'));
  }

  private async simulate(
    to: string,
    kind: 'TEXT' | 'TEMPLATE' | 'DOCUMENT',
    text: string,
    document: string | null,
    templateName?: string,
  ): Promise<SendResult> {
    const failed = isSimulatedFailure(to);
    const providerMessageId = failed ? null : `wamid.fake-${newId()}`;
    this.sent.push({ to, kind, text, providerMessageId, document });
    this.logger.log(`[WHATSAPP SIMULÉ${failed ? ' — ÉCHEC' : ''}] ${kind} vers ${to} : ${text}`);
    if (failed) {
      return {
        providerMessageId: null,
        provider: this.name,
        segments: 1,
        costAmount: 0n,
        status: 'FAILED',
        errorCode: '131026',
        errorMessage: 'Message undeliverable (échec simulé : numéro finissant par 99).',
        raw: { simulated: true, to, templateName: templateName ?? null },
      };
    }
    return {
      providerMessageId,
      provider: this.name,
      segments: 1,
      costAmount: 0n,
      status: 'SENT',
      raw: { simulated: true, to, templateName: templateName ?? null, document },
    };
  }
}
