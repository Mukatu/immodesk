import { Injectable } from '@nestjs/common';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import { AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import type {
  NotificationOutcome,
  NotificationOutcomeListener,
} from '../../notifications/domain/ports';

/**
 * Passe une quittance à SENT dès que son message est accepté par un canal.
 * Seules les colonnes de workflow sont écrites (`status`, `sent_at`,
 * `sent_channel`, `message_log_id`) : `guard_financial_row` le permet.
 */
@Injectable()
export class ReceiptDeliveryListener implements NotificationOutcomeListener {
  constructor(private readonly auditService: AuditService) {}

  async onOutcome(tx: TenantClient, outcome: NotificationOutcome): Promise<void> {
    if (
      outcome.relatedEntityType !== 'receipt' ||
      !outcome.relatedEntityId ||
      outcome.status !== 'SENT'
    )
      return;
    const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `UPDATE receipts
          SET status = 'SENT', sent_at = now(), sent_channel = $2::notification_channel,
              message_log_id = $3::uuid, updated_at = now()
        WHERE id = $1::uuid AND status IN ('ISSUED', 'SENT')
        RETURNING id`,
      outcome.relatedEntityId,
      outcome.channel,
      outcome.messageLogId,
    );
    if (rows.length === 0) return;
    await this.auditService.record(tx, {
      organizationId: outcome.organizationId,
      actorLabel: 'worker.notifications',
      action: 'STATE_TRANSITION',
      operation: AUDIT_OPERATIONS.RECEIPT_SENT,
      entityType: 'receipts',
      entityId: outcome.relatedEntityId,
      newState: toJsonState({
        status: 'SENT',
        channel: outcome.channel,
        notificationId: outcome.notificationId,
      }),
    });
  }
}
