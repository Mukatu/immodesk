import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { estimatedCost } from '../domain/delivery-rules';
import type {
  DeliveryEvent,
  DocumentMessage,
  OutboundMessage,
  SendResult,
  TemplateMessage,
  WhatsAppProvider,
} from '../domain/ports';
import { parseMetaStatuses, verifyMetaSignature } from '../domain/webhook-parsing';

/**
 * Meta WhatsApp Cloud API, en accès direct (pas d'intermédiaire).
 *
 * `POST {base}/{version}/{phoneNumberId}/messages`, jeton Bearer. Hors de la
 * fenêtre de service de 24 h, seul un MODÈLE approuvé passe : les quittances
 * partent donc par modèle, le PDF en en-tête « document » par lien signé.
 * Délai de 10 s : au-delà, l'envoi est tenu pour échoué et le SMS prend le
 * relais — attendre plus longtemps retiendrait le worker pour rien.
 */
@Injectable()
export class MetaWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'meta-whatsapp';
  private readonly logger = new Logger(MetaWhatsAppProvider.name);

  constructor(private readonly config: AppConfigService) {}

  async send(message: OutboundMessage): Promise<SendResult> {
    return this.post(message.to, { type: 'text', text: { body: message.body, preview_url: true } });
  }

  async sendTemplate(message: TemplateMessage): Promise<SendResult> {
    const components: Array<Record<string, unknown>> = [];
    if (message.document) {
      components.push({
        type: 'header',
        parameters: [
          {
            type: 'document',
            document: { link: message.document.link, filename: message.document.filename },
          },
        ],
      });
    }
    if (message.bodyParameters.length > 0) {
      components.push({
        type: 'body',
        parameters: message.bodyParameters.map((text) => ({ type: 'text', text })),
      });
    }
    return this.post(message.to, {
      type: 'template',
      template: { name: message.templateName, language: { code: message.language }, components },
    });
  }

  async sendDocument(message: DocumentMessage): Promise<SendResult> {
    return this.post(message.to, {
      type: 'document',
      document: {
        link: message.link,
        filename: message.filename,
        ...(message.caption ? { caption: message.caption } : {}),
      },
    });
  }

  parseWebhook(body: unknown): DeliveryEvent[] {
    return parseMetaStatuses(body);
  }

  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
    return verifyMetaSignature(rawBody, signatureHeader, this.config.get('WHATSAPP_APP_SECRET'));
  }

  private async post(to: string, content: Record<string, unknown>): Promise<SendResult> {
    const phoneNumberId = this.config.get('WHATSAPP_PHONE_NUMBER_ID');
    const token = this.config.get('WHATSAPP_ACCESS_TOKEN');
    const base = this.config.get('WHATSAPP_API_BASE_URL').replace(/\/+$/, '');
    const url = `${base}/${this.config.get('WHATSAPP_API_VERSION')}/${phoneNumberId}/messages`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to.replace(/^\+/, ''),
          ...content,
        }),
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => ({}))) as Record<string, any>;
      const messageId = payload?.messages?.[0]?.id;
      if (response.ok && typeof messageId === 'string') {
        return {
          providerMessageId: messageId,
          provider: this.name,
          segments: 1,
          costAmount: estimatedCost(this.name),
          status: 'SENT',
          raw: payload,
        };
      }
      const error = payload?.error ?? {};
      return {
        providerMessageId: null,
        provider: this.name,
        segments: 1,
        costAmount: 0n,
        status: 'FAILED',
        errorCode: error.code !== undefined ? String(error.code) : `HTTP_${response.status}`,
        errorMessage:
          error.error_data?.details ?? error.message ?? `Réponse HTTP ${response.status}`,
        raw: payload,
      };
    } catch (error) {
      this.logger.warn(`Cloud API injoignable : ${(error as Error).message}`);
      return {
        providerMessageId: null,
        provider: this.name,
        segments: 1,
        costAmount: 0n,
        status: 'FAILED',
        errorCode: 'NETWORK_ERROR',
        errorMessage: (error as Error).message,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
