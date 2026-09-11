import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { DocumentsService } from '../../documents/application/documents.service';
import {
  channelSequence,
  isAccepted,
  orderedParameters,
  toGsm7,
  type DeliveryChannel,
} from '../domain/delivery-rules';
import {
  NOTIFICATION_OUTCOME_LISTENERS,
  SMS_PROVIDER,
  WHATSAPP_PROVIDER,
  type NotificationOutcome,
  type NotificationOutcomeListener,
  type SendResult,
  type SmsProvider,
  type WhatsAppProvider,
} from '../domain/ports';
import { MESSAGE_TEMPLATE_CODES } from '../domain/template-codes';
import { systemTemplate } from '../domain/template-catalog';
import { renderTemplate } from '../domain/template-renderer';
import type { NotificationPayload } from './notification-pipeline.service';

interface ChannelTemplate {
  body: string;
  providerTemplateName: string | null;
  providerTemplateLang: string | null;
  variables: string[];
}

/**
 * Envoi effectif d'une notification, canal par canal : WhatsApp par modèle
 * approuvé (PDF joint par lien signé longue durée), puis SMS de repli en
 * GSM-7 avec lien court. Chaque tentative écrit une ligne `message_logs`.
 */
@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly documents: DocumentsService,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsAppProvider,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    @Optional()
    @Inject(NOTIFICATION_OUTCOME_LISTENERS)
    private readonly listeners: NotificationOutcomeListener[] | null = null,
  ) {}

  async deliver(
    organizationId: string,
    notificationId: string,
    from?: DeliveryChannel | null,
  ): Promise<'SENT' | 'FAILED' | 'SKIPPED'> {
    const loaded = await this.prisma.withTenant(organizationId, null, async (tx) => {
      const notification = await tx.notifications.findFirst({ where: { id: notificationId } });
      if (
        !notification ||
        notification.status === 'CANCELLED' ||
        (notification.status === 'SENT' && !from)
      )
        return null;
      const payload = notification.payload as unknown as NotificationPayload;
      const templates = await tx.notification_templates.findMany({
        where: { code: payload.templateCode, is_active: true },
      });
      const attachment = payload.attachments?.[0];
      const link = attachment
        ? await this.documents.signedLinkFor(
            tx,
            attachment.documentId,
            this.config.get('DOCUMENT_LINK_TTL_SECONDS'),
          )
        : null;
      return { notification, payload, templates, attachment, link };
    });
    if (!loaded) return 'SKIPPED';
    const { notification, payload } = loaded;

    for (const channel of channelSequence(payload.channelOrder, from)) {
      const template = this.templateFor(loaded.templates, payload.templateCode, channel);
      if (!template) continue;
      const body = renderTemplate(template.body, payload.variables);
      const to = notification.recipient_address;
      let result: SendResult;
      try {
        result =
          channel === 'WHATSAPP'
            ? await this.whatsapp.sendTemplate({
                to,
                templateName: template.providerTemplateName ?? payload.templateCode.toLowerCase(),
                language: template.providerTemplateLang ?? 'fr',
                bodyParameters: orderedParameters(payload.variables, template.variables),
                document:
                  loaded.link && loaded.attachment
                    ? { link: loaded.link.downloadUrl, filename: loaded.attachment.fileName }
                    : null,
                previewText: body,
              })
            : await this.sms.send({
                to,
                body: toGsm7(body),
                templateCode: payload.templateCode,
                relatedEntityType: notification.related_entity_type ?? undefined,
                relatedEntityId: notification.related_entity_id ?? undefined,
              });
      } catch (error) {
        result = {
          providerMessageId: null,
          provider: channel === 'WHATSAPP' ? this.whatsapp.name : this.sms.name,
          segments: 1,
          costAmount: 0n,
          status: 'FAILED',
          errorCode: 'PROVIDER_ERROR',
          errorMessage: (error as Error).message,
        };
      }
      const accepted = isAccepted(result.status);
      await this.prisma.withTenant(organizationId, null, async (tx) => {
        const logId = newId();
        const now = new Date();
        await tx.message_logs.create({
          data: {
            id: logId,
            organization_id: organizationId,
            notification_id: notification.id,
            channel,
            status: result.status === 'FAILED' ? 'FAILED' : result.status,
            provider: result.provider,
            provider_message_id: result.providerMessageId,
            direction: 'OUTBOUND',
            to_address: to,
            template_code: payload.templateCode,
            content_preview: this.preview(
              payload.templateCode,
              channel === 'SMS' ? toGsm7(body) : body,
            ),
            segments_count: result.segments,
            cost_amount: result.costAmount,
            queued_at: now,
            sent_at: result.status === 'SENT' ? now : null,
            failed_at: result.status === 'FAILED' ? now : null,
            error_code: result.errorCode ?? null,
            error_message: result.errorMessage ?? null,
            raw_payload: (result.raw ?? {}) as object,
            related_entity_type: notification.related_entity_type,
            related_entity_id: notification.related_entity_id,
          },
        });
        await tx.notifications.update({
          where: { id: notification.id },
          data: {
            attempts: { increment: 1 },
            channel,
            ...(accepted
              ? { status: 'SENT', sent_at: now, last_error: null }
              : {
                  last_error:
                    `${channel} : ${result.errorCode ?? 'ECHEC'} ${result.errorMessage ?? ''}`
                      .trim()
                      .slice(0, 500),
                }),
            updated_at: now,
          },
        });
        if (accepted)
          await this.announce(tx, {
            organizationId,
            notificationId: notification.id,
            channel,
            messageLogId: logId,
            status: 'SENT',
            relatedEntityType: notification.related_entity_type,
            relatedEntityId: notification.related_entity_id,
          });
      });
      if (accepted) return 'SENT';
      this.logger.warn(
        `Envoi ${channel} en échec (${result.errorCode}) pour la notification ${notification.id}.`,
      );
    }

    await this.prisma.withTenant(organizationId, null, async (tx) => {
      await tx.notifications.update({
        where: { id: notification.id },
        data: { status: 'FAILED', failed_at: new Date(), updated_at: new Date() },
      });
      await this.announce(tx, {
        organizationId,
        notificationId: notification.id,
        channel: notification.channel,
        messageLogId: null,
        status: 'FAILED',
        relatedEntityType: notification.related_entity_type,
        relatedEntityId: notification.related_entity_id,
      });
    });
    return 'FAILED';
  }

  private templateFor(
    rows: Array<{
      channel: string;
      body: string;
      provider_template_name: string | null;
      provider_template_lang: string | null;
      variables: unknown;
    }>,
    code: string,
    channel: DeliveryChannel,
  ): ChannelTemplate | null {
    const row = rows.find((t) => t.channel === channel);
    const fallback = systemTemplate(code, channel);
    if (!row && !fallback) return null;
    const variables = Array.isArray(row?.variables)
      ? (row?.variables as string[])
      : (fallback?.variables ?? []);
    return {
      body: row?.body ?? fallback?.body ?? '',
      providerTemplateName: row?.provider_template_name ?? fallback?.providerTemplateName ?? null,
      providerTemplateLang: row?.provider_template_lang ?? fallback?.providerTemplateLang ?? null,
      variables,
    };
  }

  /** Un code de connexion ne survit jamais dans le journal technique. */
  private preview(code: string, body: string): string {
    if (code === MESSAGE_TEMPLATE_CODES.OTP_CODE || code === 'auth.otp_login')
      return 'Code de connexion Immodesk (code expurgé).';
    return body.length > 180 ? `${body.slice(0, 177)}...` : body;
  }

  private async announce(
    tx: Parameters<NotificationOutcomeListener['onOutcome']>[0],
    outcome: NotificationOutcome,
  ): Promise<void> {
    for (const listener of this.listeners ?? []) await listener.onOutcome(tx, outcome);
  }
}
