import { toIsoInstant } from '../../parties/application/party-views';

export interface WebhookEventRow {
  id: string;
  organization_id: string | null;
  source: string;
  event_type: string;
  status: string;
  external_event_id: string | null;
  signature_valid: boolean | null;
  received_at: Date;
  processed_at: Date | null;
  processing_attempts: number;
  error_message: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  raw_payload: unknown;
  created_at: Date;
}

export interface WebhookEventView {
  id: string;
  source: string;
  eventType: string;
  status: string;
  externalEventId: string | null;
  signatureValid: boolean | null;
  receivedAt: string;
  processedAt: string | null;
  processingAttempts: number;
  errorMessage: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  rawPayload: unknown;
}

export function toWebhookEventView(row: WebhookEventRow): WebhookEventView {
  return {
    id: row.id,
    source: row.source,
    eventType: row.event_type,
    status: row.status,
    externalEventId: row.external_event_id,
    signatureValid: row.signature_valid,
    receivedAt: row.received_at.toISOString(),
    processedAt: toIsoInstant(row.processed_at),
    processingAttempts: row.processing_attempts,
    errorMessage: row.error_message,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    rawPayload: row.raw_payload,
  };
}
