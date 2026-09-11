/** Canal de notification, aligné sur l'énumération SQL `notification_channel`. */
export type NotificationChannel = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'PUSH' | 'IN_APP';

export interface OutboundMessage {
  /** Destinataire au format E.164. */
  to: string;
  /** Corps du message déjà rendu. */
  body: string;
  /** Code du modèle utilisé (`notification_templates.code`). */
  templateCode?: string;
  /** Entité métier à l'origine du message (pour la traçabilité). */
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export interface SendResult {
  /** Identifiant du message chez le fournisseur, si connu. */
  providerMessageId: string | null;
  /** Nom du fournisseur, repris dans `message_logs.provider`. */
  provider: string;
  /** Nombre de segments facturés. */
  segments: number;
  /** Coût unitaire en XAF (BigInt : jamais de flottant). */
  costAmount: bigint;
  status: 'SENT' | 'QUEUED' | 'FAILED';
  errorCode?: string;
  errorMessage?: string;
  /** Réponse brute du fournisseur, stockée en JSONB. */
  raw?: Record<string, unknown>;
}

/** Évènement de remise normalisé, quel que soit le fournisseur. */
export interface DeliveryEvent {
  providerMessageId: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  occurredAt: Date;
  errorCode?: string | null;
  errorMessage?: string | null;
  raw: Record<string, unknown>;
}

/** Message WhatsApp par modèle approuvé (seul admis hors fenêtre de 24 h). */
export interface TemplateMessage {
  to: string;
  templateName: string;
  language: string;
  /** Paramètres positionnels du corps (`{{1}}`, `{{2}}`, ...). */
  bodyParameters: string[];
  /** Pièce jointe PDF passée par lien (en-tête document du modèle). */
  document?: { link: string; filename: string } | null;
  /** Texte rendu, conservé dans le journal. */
  previewText: string;
}

export interface DocumentMessage {
  to: string;
  link: string;
  filename: string;
  caption?: string;
}

/** Passerelle SMS : `FakeSmsProvider`, `AndroidGatewaySmsProvider`. */
export interface SmsProvider {
  readonly name: string;
  send(message: OutboundMessage): Promise<SendResult>;
  parseDeliveryWebhook(body: unknown): DeliveryEvent[];
}

/** Passerelle WhatsApp : `FakeWhatsAppProvider`, `MetaWhatsAppProvider` (Cloud API). */
export interface WhatsAppProvider {
  readonly name: string;
  /** Message libre (fenêtre de 24 h) — conservé pour la compatibilité de la phase 0. */
  send(
    message: OutboundMessage & { templateName?: string; templateLang?: string },
  ): Promise<SendResult>;
  sendTemplate(message: TemplateMessage): Promise<SendResult>;
  sendDocument(message: DocumentMessage): Promise<SendResult>;
  parseWebhook(body: unknown): DeliveryEvent[];
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean;
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');
export const WHATSAPP_PROVIDER = Symbol('WHATSAPP_PROVIDER');

// ---------------------------------------------------------------------------
// Pipeline de notification (phase 3)
// ---------------------------------------------------------------------------

/** Destinataire d'une notification métier. */
export interface NotificationRecipient {
  /** Numéro E.164 : WhatsApp et SMS partagent le même identifiant. */
  phone: string;
  name?: string | null;
  tenantId?: string | null;
  landlordId?: string | null;
  userId?: string | null;
}

/** Pièce jointe : un document déjà archivé dans `documents`. */
export interface NotificationAttachment {
  documentId: string;
  fileName: string;
}

export interface EnqueueNotificationInput {
  organizationId: string;
  templateCode: string;
  /** Ordre des canaux ; à défaut, `messaging.receiptChannelOrder` de l'organisation. */
  channelOrder?: NotificationChannel[];
  recipient: NotificationRecipient;
  variables: Record<string, string>;
  attachments?: NotificationAttachment[];
  relatedEntity?: { type: string; id: string };
  /** Clé anti-doublon (`notifications_dedupe_uk`) : un second appel rend le premier envoi. */
  dedupeKey?: string | null;
  actorUserId?: string | null;
}

/**
 * Port d'enfilement d'une notification : implémenté par `notifications`,
 * consommé par `billing`, `receipts` et `cash`. L'appelant ne connaît ni
 * BullMQ, ni WhatsApp, ni la passerelle SMS.
 */
export interface NotificationEnqueuer {
  enqueue(input: EnqueueNotificationInput): Promise<{ notificationId: string; created: boolean }>;
}

export const NOTIFICATION_ENQUEUER = Symbol('NOTIFICATION_ENQUEUER');

/** Issue d'une notification, communiquée au module propriétaire de l'entité. */
export interface NotificationOutcome {
  organizationId: string;
  notificationId: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  channel: NotificationChannel;
  messageLogId: string | null;
  status: 'SENT' | 'FAILED';
}

/**
 * Abonnés aux issues d'envoi : `receipts` y passe une quittance à SENT. Le
 * pipeline de notification ignore tout des quittances.
 */
export interface NotificationOutcomeListener {
  onOutcome(
    tx: import('../../../shared/prisma/prisma.service').TenantClient,
    outcome: NotificationOutcome,
  ): Promise<void>;
}

export const NOTIFICATION_OUTCOME_LISTENERS = Symbol('NOTIFICATION_OUTCOME_LISTENERS');
