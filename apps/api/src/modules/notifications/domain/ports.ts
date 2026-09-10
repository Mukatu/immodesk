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

/** Passerelle SMS. Première implémentation : `FakeSmsProvider`. */
export interface SmsProvider {
  readonly name: string;
  send(message: OutboundMessage): Promise<SendResult>;
}

/** Passerelle WhatsApp (Meta Cloud API). Non implémentée en phase 0. */
export interface WhatsAppProvider {
  readonly name: string;
  send(
    message: OutboundMessage & { templateName?: string; templateLang?: string },
  ): Promise<SendResult>;
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');
export const WHATSAPP_PROVIDER = Symbol('WHATSAPP_PROVIDER');
