import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { channelSequence, type DeliveryChannel } from '../domain/delivery-rules';
import { toMessageLogView, type MessageLogRow, type MessageLogView } from './message-log-views';
import {
  NotificationPipelineService,
  type NotificationPayload,
} from './notification-pipeline.service';

export interface MessageLogFilters {
  channel?: string;
  status?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}

/** Journal des envois et relance manuelle. */
@Injectable()
export class MessageLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly pipeline: NotificationPipelineService,
  ) {}

  async list(
    organizationId: string,
    userId: string,
    filters: MessageLogFilters,
  ): Promise<Page<MessageLogView>> {
    const conditions = ['ml.organization_id = $1::uuid'];
    const params: unknown[] = [organizationId];
    const bind = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };
    if (filters.channel)
      conditions.push(`ml.channel = ${bind(filters.channel)}::notification_channel`);
    if (filters.status) conditions.push(`ml.status = ${bind(filters.status)}::message_status`);
    if (filters.relatedEntityType)
      conditions.push(`ml.related_entity_type = ${bind(filters.relatedEntityType)}`);
    if (filters.relatedEntityId)
      conditions.push(`ml.related_entity_id = ${bind(filters.relatedEntityId)}::uuid`);
    if (filters.from) conditions.push(`ml.queued_at >= ${bind(filters.from.slice(0, 10))}::date`);
    if (filters.to) conditions.push(`ml.queued_at < (${bind(filters.to.slice(0, 10))}::date + 1)`);
    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'ml');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<MessageLogRow[]>(
        `SELECT ml.* FROM message_logs ml WHERE ${conditions.join(' AND ')} ${keysetOrderBy('ml')} LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );
    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return { items: page.items.map(toMessageLogView), pageInfo: page.pageInfo };
  }

  /**
   * Relance : une NOUVELLE notification reprend le contenu de l'envoi échoué
   * et repart du canal de ce message. L'envoi d'origine reste intact dans le
   * journal, qui n'est jamais réécrit pour « effacer » un échec.
   */
  async retry(
    organizationId: string,
    userId: string,
    logId: string,
  ): Promise<{ notificationId: string }> {
    const source = await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const log = await tx.message_logs.findFirst({ where: { id: logId } });
      if (!log) throw new DomainError('NOTIFICATIONS.MESSAGE_LOG_NOT_FOUND', { id: logId });
      const notification = log.notification_id
        ? await tx.notifications.findFirst({ where: { id: log.notification_id } })
        : null;
      if (!notification)
        throw new DomainError('NOTIFICATIONS.MESSAGE_LOG_NOT_FOUND', {
          id: logId,
          reason: 'NO_NOTIFICATION',
        });
      return { log, notification };
    });
    const payload = source.notification.payload as unknown as NotificationPayload;
    const result = await this.pipeline.enqueue({
      organizationId,
      templateCode: payload.templateCode,
      channelOrder: channelSequence(payload.channelOrder, source.log.channel as DeliveryChannel),
      recipient: {
        phone: source.notification.recipient_address,
        name: payload.recipientName,
        tenantId: source.notification.recipient_tenant_id,
        landlordId: source.notification.recipient_landlord_id,
        userId: source.notification.recipient_user_id,
      },
      variables: payload.variables,
      attachments: payload.attachments,
      relatedEntity:
        source.notification.related_entity_type && source.notification.related_entity_id
          ? {
              type: source.notification.related_entity_type,
              id: source.notification.related_entity_id,
            }
          : undefined,
      actorUserId: userId,
    });
    return { notificationId: result.notificationId };
  }
}
