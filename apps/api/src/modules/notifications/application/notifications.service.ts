import { Inject, Injectable, Logger } from '@nestjs/common';
import { newId } from '../../../shared/ids/uuid';
import { maskPhone } from '../../../shared/phone/e164';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import {
  SMS_PROVIDER,
  WHATSAPP_PROVIDER,
  type NotificationChannel,
  type SendResult,
  type SmsProvider,
  type WhatsAppProvider,
} from '../domain/ports';
import { renderTemplate } from '../domain/template-renderer';

/** Codes des modèles système livrés en phase 0. */
export const TEMPLATE_CODES = {
  OTP_LOGIN: 'auth.otp_login',
  INVITATION: 'org.invitation',
  WELCOME: 'user.welcome',
} as const;

export interface SendTemplatedSmsInput {
  /**
   * Organisation à laquelle rattacher la trace `message_logs`.
   * `null` lorsqu'aucune organisation n'est encore connue (première
   * connexion d'un utilisateur sans adhésion) : le message est alors envoyé
   * mais non tracé, `message_logs.organization_id` étant NOT NULL et soumis
   * à la RLS.
   */
  organizationId: string | null;
  to: string;
  templateCode: string;
  variables: Record<string, string>;
  /** Corps de repli si aucun modèle n'existe pour cette organisation. */
  fallbackBody: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  channel?: NotificationChannel;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsAppProvider,
  ) {}

  /**
   * Rend un modèle puis l'envoie par SMS (ou WhatsApp) et trace le résultat
   * dans `message_logs`.
   */
  async sendTemplated(input: SendTemplatedSmsInput): Promise<SendResult> {
    const channel: NotificationChannel = input.channel ?? 'SMS';
    const body = await this.renderBody(input, channel);

    const provider = channel === 'WHATSAPP' ? this.whatsapp : this.sms;
    let result: SendResult;
    try {
      result = await provider.send({
        to: input.to,
        body,
        templateCode: input.templateCode,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
      });
    } catch (error) {
      result = {
        providerMessageId: null,
        provider: provider.name,
        segments: 1,
        costAmount: 0n,
        status: 'FAILED',
        errorCode: 'PROVIDER_ERROR',
        errorMessage: (error as Error).message,
      };
    }

    await this.trace(input, channel, body, result);
    return result;
  }

  /** Journalise l'envoi dans `message_logs`, dans le contexte du tenant. */
  private async trace(
    input: SendTemplatedSmsInput,
    channel: NotificationChannel,
    body: string,
    result: SendResult,
  ): Promise<void> {
    if (!input.organizationId) {
      this.logger.debug?.(
        `Message ${input.templateCode} vers ${maskPhone(input.to)} non tracé : aucune organisation rattachée.`,
      );
      return;
    }
    try {
      await this.prisma.withTenant(input.organizationId, null, (tx) =>
        this.writeLog(tx, input.organizationId as string, input, channel, body, result),
      );
    } catch (error) {
      this.logger.warn(`Trace message_logs impossible : ${(error as Error).message}`);
    }
  }

  private async writeLog(
    tx: TenantClient,
    organizationId: string,
    input: SendTemplatedSmsInput,
    channel: NotificationChannel,
    body: string,
    result: SendResult,
  ): Promise<void> {
    const now = new Date();
    await tx.message_logs.create({
      data: {
        id: newId(),
        organization_id: organizationId,
        channel,
        status: result.status === 'SENT' ? 'SENT' : result.status === 'QUEUED' ? 'QUEUED' : 'FAILED',
        provider: result.provider,
        provider_message_id: result.providerMessageId,
        direction: 'OUTBOUND',
        to_address: input.to,
        template_code: input.templateCode,
        // Le contenu complet n'est jamais stocké : un code OTP ne doit pas
        // survivre à son usage dans le journal technique.
        content_preview: this.preview(body, input.templateCode),
        segments_count: result.segments,
        cost_amount: result.costAmount,
        queued_at: now,
        sent_at: result.status === 'SENT' ? now : null,
        failed_at: result.status === 'FAILED' ? now : null,
        error_code: result.errorCode ?? null,
        error_message: result.errorMessage ?? null,
        raw_payload: (result.raw ?? {}) as object,
        related_entity_type: input.relatedEntityType ?? null,
        related_entity_id: input.relatedEntityId ?? null,
      },
    });
  }

  private preview(body: string, templateCode: string): string {
    if (templateCode === TEMPLATE_CODES.OTP_LOGIN) {
      return 'Code de connexion Immodesk (code expurgé).';
    }
    return body.length > 180 ? `${body.slice(0, 177)}...` : body;
  }

  /**
   * Cherche le modèle de l'organisation ; à défaut, applique le corps de
   * repli fourni par l'appelant.
   */
  private async renderBody(
    input: SendTemplatedSmsInput,
    channel: NotificationChannel,
  ): Promise<string> {
    if (!input.organizationId) {
      return renderTemplate(input.fallbackBody, input.variables);
    }
    try {
      const template = await this.prisma.withTenant(input.organizationId, null, (tx) =>
        tx.notification_templates.findFirst({
          where: {
            organization_id: input.organizationId as string,
            code: input.templateCode,
            channel,
            is_active: true,
          },
          select: { body: true },
        }),
      );
      return renderTemplate(template?.body ?? input.fallbackBody, input.variables);
    } catch (error) {
      this.logger.warn(`Lecture du modèle impossible : ${(error as Error).message}`);
      return renderTemplate(input.fallbackBody, input.variables);
    }
  }
}
