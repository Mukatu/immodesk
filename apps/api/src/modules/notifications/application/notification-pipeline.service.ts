import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { normalizePhoneE164 } from '../../../shared/phone/e164';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { isUniqueViolation } from '../../../shared/prisma/sql-errors';
import { readOperationalSettings } from '../../../shared/settings/operational-settings';
import { channelSequence, type DeliveryChannel } from '../domain/delivery-rules';
import type {
  EnqueueNotificationInput,
  NotificationAttachment,
  NotificationEnqueuer,
} from '../domain/ports';
import { systemTemplate } from '../domain/template-catalog';
import { renderTemplate } from '../domain/template-renderer';
import { NotificationsWorker } from '../infrastructure/notifications.worker';

/** Contenu de `notifications.payload` : tout ce qu'il faut pour (re)tenter l'envoi. */
export interface NotificationPayload {
  templateCode: string;
  channelOrder: DeliveryChannel[];
  variables: Record<string, string>;
  attachments: NotificationAttachment[];
  recipientName: string | null;
}

/**
 * Port `NOTIFICATION_ENQUEUER` : `notifications` (SCHEDULED) puis job BullMQ
 * `notifications` (QUEUED). L'envoi réel se fait hors de la requête, par le
 * worker. `dedupeKey` rend l'appel idempotent : la quittance n'est envoyée
 * qu'une fois même si le pipeline de documents est rejoué.
 */
@Injectable()
export class NotificationPipelineService implements NotificationEnqueuer {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsWorker)) private readonly worker: NotificationsWorker,
  ) {}

  async enqueue(
    input: EnqueueNotificationInput,
  ): Promise<{ notificationId: string; created: boolean }> {
    let phone: string;
    try {
      phone = normalizePhoneE164(input.recipient.phone);
    } catch {
      throw new DomainError('NOTIFICATIONS.NO_RECIPIENT', { phone: input.recipient.phone });
    }
    const organizationId = input.organizationId;
    const actor = input.actorUserId ?? null;

    const created = await this.prisma
      .withTenant(organizationId, actor, async (tx) => {
        if (input.dedupeKey) {
          const existing = await tx.notifications.findFirst({
            where: { dedupe_key: input.dedupeKey },
            select: { id: true },
          });
          if (existing) return { id: existing.id, created: false };
        }
        const settings = await tx.organization_settings.findUnique({
          where: { organization_id: organizationId },
          select: { settings_json: true },
        });
        const order = channelSequence(
          input.channelOrder ??
            readOperationalSettings(settings?.settings_json).messaging.receiptChannelOrder,
        );
        const template = await tx.notification_templates.findFirst({
          where: { code: input.templateCode, channel: order[0], is_active: true },
          select: { id: true, body: true },
        });
        const body = renderTemplate(
          template?.body ??
            systemTemplate(input.templateCode, order[0])?.body ??
            input.templateCode,
          input.variables,
        );
        const payload: NotificationPayload = {
          templateCode: input.templateCode,
          channelOrder: order,
          variables: input.variables,
          attachments: input.attachments ?? [],
          recipientName: input.recipient.name ?? null,
        };
        const id = newId();
        await tx.notifications.create({
          data: {
            id,
            organization_id: organizationId,
            template_id: template?.id ?? null,
            channel: order[0],
            status: 'SCHEDULED',
            recipient_user_id: input.recipient.userId ?? null,
            recipient_tenant_id: input.recipient.tenantId ?? null,
            recipient_landlord_id: input.recipient.landlordId ?? null,
            recipient_address: phone,
            body,
            payload: payload as unknown as object,
            related_entity_type: input.relatedEntity?.type ?? null,
            related_entity_id: input.relatedEntity?.id ?? null,
            max_attempts: order.length,
            dedupe_key: input.dedupeKey ?? null,
          },
        });
        return { id, created: true };
      })
      .catch(async (error: unknown) => {
        if (input.dedupeKey && isUniqueViolation(error, 'dedupe')) {
          const existing = await this.prisma.withTenant(organizationId, actor, (tx) =>
            tx.notifications.findFirst({
              where: { dedupe_key: input.dedupeKey as string },
              select: { id: true },
            }),
          );
          if (existing) return { id: existing.id, created: false };
        }
        throw error;
      });

    if (created.created) {
      const jobId = await this.worker.dispatch({ organizationId, notificationId: created.id });
      await this.prisma.withTenant(organizationId, actor, (tx) =>
        tx.notifications.updateMany({
          where: { id: created.id, status: 'SCHEDULED' },
          data: { status: 'QUEUED', job_id: jobId, updated_at: new Date() },
        }),
      );
    }
    return { notificationId: created.id, created: created.created };
  }
}
