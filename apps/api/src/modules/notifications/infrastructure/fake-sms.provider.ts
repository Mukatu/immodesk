import { Injectable, Logger } from '@nestjs/common';
import { newId } from '../../../shared/ids/uuid';
import type { OutboundMessage, SendResult, SmsProvider, WhatsAppProvider } from '../domain/ports';

/**
 * Passerelle SMS de développement : n'envoie rien, journalise le message
 * (code OTP compris) pour permettre les essais locaux et les tests
 * d'intégration. Refusée en production par la validation de configuration.
 */
@Injectable()
export class FakeSmsProvider implements SmsProvider {
  readonly name = 'fake-sms';
  private readonly logger = new Logger(FakeSmsProvider.name);

  /** Dernier message émis, exploité par les tests d'intégration. */
  private lastMessage: (OutboundMessage & { sentAt: Date }) | null = null;

  async send(message: OutboundMessage): Promise<SendResult> {
    this.lastMessage = { ...message, sentAt: new Date() };
    this.logger.log(`[SMS SIMULÉ] vers ${message.to} : ${message.body}`);
    return {
      providerMessageId: `fake-${newId()}`,
      provider: this.name,
      segments: Math.max(1, Math.ceil(message.body.length / 160)),
      costAmount: 0n,
      status: 'SENT',
      raw: { simulated: true, to: message.to },
    };
  }

  /** Lecture du dernier message simulé (tests uniquement). */
  peekLastMessage(): (OutboundMessage & { sentAt: Date }) | null {
    return this.lastMessage;
  }
}

/**
 * Passerelle WhatsApp de développement. La phase 0 n'implémente que le SMS ;
 * ce fournisseur existe pour que l'interface soit branchée et testée.
 */
@Injectable()
export class FakeWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'fake-whatsapp';
  private readonly logger = new Logger(FakeWhatsAppProvider.name);

  async send(message: OutboundMessage): Promise<SendResult> {
    this.logger.log(`[WHATSAPP SIMULÉ] vers ${message.to} : ${message.body}`);
    return {
      providerMessageId: `fake-wa-${newId()}`,
      provider: this.name,
      segments: 1,
      costAmount: 0n,
      status: 'SENT',
      raw: { simulated: true, to: message.to },
    };
  }
}
