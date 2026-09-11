import { toJsonAmount } from '../../../shared/money/amount';

export interface MessageLogRow {
  id: string;
  notification_id: string | null;
  channel: string;
  status: string;
  provider: string;
  provider_message_id: string | null;
  to_address: string;
  template_code: string | null;
  content_preview: string | null;
  cost_amount: bigint;
  queued_at: Date;
  sent_at: Date | null;
  delivered_at: Date | null;
  read_at: Date | null;
  failed_at: Date | null;
  error_code: string | null;
  error_message: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: Date;
}

export interface MessageLogView {
  id: string;
  notificationId: string | null;
  channel: string;
  status: string;
  provider: string;
  providerMessageId: string | null;
  toAddress: string;
  templateCode: string | null;
  contentPreview: string | null;
  costAmount: number;
  queuedAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
}

const instant = (value: Date | null): string | null => (value ? value.toISOString() : null);

export function toMessageLogView(row: MessageLogRow): MessageLogView {
  return {
    id: row.id,
    notificationId: row.notification_id,
    channel: row.channel,
    status: row.status,
    provider: row.provider,
    providerMessageId: row.provider_message_id,
    toAddress: row.to_address,
    templateCode: row.template_code,
    contentPreview: row.content_preview,
    costAmount: toJsonAmount(row.cost_amount),
    queuedAt: row.queued_at.toISOString(),
    sentAt: instant(row.sent_at),
    deliveredAt: instant(row.delivered_at),
    readAt: instant(row.read_at),
    failedAt: instant(row.failed_at),
    errorCode: row.error_code,
    errorMessage: row.error_message,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
  };
}
