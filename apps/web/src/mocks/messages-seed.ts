/**
 * Mock MSW — Phase 3 (journal des messages WhatsApp/SMS), état en mémoire et
 * données de démonstration, conformes à docs/api/phase3-contract.md. Seed
 * appelé après seedReceiptsDemoData (rattache les messages à la quittance
 * démonstration) et seedCashDemoData (rattache un message au reçu de caisse).
 */
import type { MockReceipt } from './receipts-seed';

export type MessageChannelMock = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'PUSH' | 'IN_APP';
export type MessageStatusMock =
  'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'REJECTED' | 'EXPIRED';

export interface MockMessageLog {
  id: string;
  organizationId: string;
  notificationId: string | null;
  channel: MessageChannelMock;
  status: MessageStatusMock;
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

export const messageLogs = new Map<string, MockMessageLog>();

export interface SeedMessagesDeps {
  receipts: Map<string, MockReceipt>;
  DEMO_ORG_ID: string;
  nextId: (prefix: string) => string;
  tenantPhone: (tenantId: string) => string;
}

/** Seed de 4 message_logs variés (envoyé, remis, lu, échec) liés à la quittance démonstration. */
export function seedMessagesDemoData(deps: SeedMessagesDeps): void {
  const { receipts, DEMO_ORG_ID, nextId, tenantPhone } = deps;
  const receipt = [...receipts.values()].find((r) => r.organizationId === DEMO_ORG_ID);
  if (!receipt) return;

  const toAddress = tenantPhone(receipt.tenantId);
  const base = Date.now();
  const at = (offsetMs: number) => new Date(base + offsetMs).toISOString();

  const entries: MockMessageLog[] = [
    {
      id: nextId('msglog'),
      organizationId: DEMO_ORG_ID,
      notificationId: nextId('notification'),
      channel: 'WHATSAPP',
      status: 'READ',
      provider: 'meta_whatsapp',
      providerMessageId: 'wamid.demo.read',
      toAddress,
      templateCode: 'RECEIPT_ISSUED',
      contentPreview: `Quittance ${receipt.receiptNumber} — merci pour votre règlement.`,
      costAmount: 15,
      queuedAt: at(0),
      sentAt: at(1000),
      deliveredAt: at(4000),
      readAt: at(60_000),
      failedAt: null,
      errorCode: null,
      errorMessage: null,
      relatedEntityType: 'Receipt',
      relatedEntityId: receipt.id,
    },
    {
      id: nextId('msglog'),
      organizationId: DEMO_ORG_ID,
      notificationId: nextId('notification'),
      channel: 'WHATSAPP',
      status: 'DELIVERED',
      provider: 'meta_whatsapp',
      providerMessageId: 'wamid.demo.delivered',
      toAddress,
      templateCode: 'INVOICE_ISSUED',
      contentPreview: "Avis d'échéance — loyer à régler avant le 5 du mois.",
      costAmount: 15,
      queuedAt: at(-86_400_000),
      sentAt: at(-86_399_000),
      deliveredAt: at(-86_395_000),
      readAt: null,
      failedAt: null,
      errorCode: null,
      errorMessage: null,
      relatedEntityType: 'Receipt',
      relatedEntityId: receipt.id,
    },
    {
      id: nextId('msglog'),
      organizationId: DEMO_ORG_ID,
      notificationId: nextId('notification'),
      channel: 'WHATSAPP',
      status: 'FAILED',
      provider: 'meta_whatsapp',
      providerMessageId: null,
      toAddress,
      templateCode: 'RECEIPT_ISSUED',
      contentPreview: `Quittance ${receipt.receiptNumber}`,
      costAmount: 0,
      queuedAt: at(-172_800_000),
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      failedAt: at(-172_790_000),
      errorCode: '131026',
      errorMessage: "Ce numéro n'a pas de compte WhatsApp.",
      relatedEntityType: 'Receipt',
      relatedEntityId: receipt.id,
    },
    {
      id: nextId('msglog'),
      organizationId: DEMO_ORG_ID,
      notificationId: nextId('notification'),
      channel: 'SMS',
      status: 'SENT',
      provider: 'android_gateway_sms',
      providerMessageId: 'sms.demo.sent',
      toAddress,
      templateCode: 'RECEIPT_ISSUED',
      contentPreview: `Quittance ${receipt.receiptNumber} : ${'/verifier/' + receipt.verificationToken}`,
      costAmount: 25,
      queuedAt: at(-172_789_000),
      sentAt: at(-172_788_000),
      deliveredAt: null,
      readAt: null,
      failedAt: null,
      errorCode: null,
      errorMessage: null,
      relatedEntityType: 'Receipt',
      relatedEntityId: receipt.id,
    },
  ];
  entries.forEach((entry) => messageLogs.set(entry.id, entry));
}
