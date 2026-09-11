/**
 * Mock MSW — Phase 3 (gabarits de notification WhatsApp/SMS), état en mémoire
 * et données de démonstration, conformes à docs/api/phase3-contract.md.
 */

export type NotificationChannelMock = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'PUSH' | 'IN_APP';

export interface MockNotificationTemplate {
  id: string;
  organizationId: string;
  code: string;
  channel: NotificationChannelMock;
  locale: string;
  name: string;
  subject: string | null;
  body: string;
  providerTemplateName: string | null;
  providerTemplateLang: string | null;
  variables: string[];
  isActive: boolean;
  isSystem: boolean;
  approvedAt: string | null;
}

export const notificationTemplates = new Map<string, MockNotificationTemplate>();

const VARIABLES = ['tenantName', 'amount', 'period', 'receiptNumber', 'link', 'organizationName'];

const DEFS: Array<{
  code: string;
  name: string;
  whatsappBody: string;
  smsBody: string;
  providerTemplateName: string;
}> = [
  {
    code: 'RECEIPT_ISSUED',
    name: 'Quittance de loyer',
    whatsappBody:
      'Bonjour {{tenantName}}, votre quittance {{receiptNumber}} de {{amount}} pour {{period}} est disponible : {{link}}. — {{organizationName}}',
    smsBody: 'Quittance {{receiptNumber}} ({{amount}}) : {{link}} — {{organizationName}}',
    providerTemplateName: 'receipt_issued_fr',
  },
  {
    code: 'CASH_RECEIPT_ISSUED',
    name: 'Reçu de caisse',
    whatsappBody:
      'Bonjour {{tenantName}}, nous avons bien reçu votre règlement de {{amount}}. Reçu : {{link}}. — {{organizationName}}',
    smsBody: 'Reçu de {{amount}} confirmé : {{link}} — {{organizationName}}',
    providerTemplateName: 'cash_receipt_issued_fr',
  },
  {
    code: 'INVOICE_ISSUED',
    name: "Avis d'échéance",
    whatsappBody:
      'Bonjour {{tenantName}}, votre loyer de {{period}} ({{amount}}) est à régler prochainement. — {{organizationName}}',
    smsBody: 'Loyer {{period}} ({{amount}}) à régler. — {{organizationName}}',
    providerTemplateName: 'invoice_issued_fr',
  },
];

export interface SeedNotificationTemplatesDeps {
  DEMO_ORG_ID: string;
  nextId: (prefix: string) => string;
}

/** Seed des 3 gabarits système × 2 canaux (WhatsApp, SMS). */
export function seedNotificationTemplatesDemoData(deps: SeedNotificationTemplatesDeps): void {
  const { DEMO_ORG_ID, nextId } = deps;
  for (const def of DEFS) {
    const whatsapp: MockNotificationTemplate = {
      id: nextId('template'),
      organizationId: DEMO_ORG_ID,
      code: def.code,
      channel: 'WHATSAPP',
      locale: 'fr-CG',
      name: def.name,
      subject: null,
      body: def.whatsappBody,
      providerTemplateName: def.providerTemplateName,
      providerTemplateLang: 'fr',
      variables: VARIABLES,
      isActive: true,
      isSystem: true,
      approvedAt: new Date().toISOString(),
    };
    const sms: MockNotificationTemplate = {
      id: nextId('template'),
      organizationId: DEMO_ORG_ID,
      code: def.code,
      channel: 'SMS',
      locale: 'fr-CG',
      name: def.name,
      subject: null,
      body: def.smsBody,
      providerTemplateName: null,
      providerTemplateLang: null,
      variables: VARIABLES,
      isActive: true,
      isSystem: true,
      approvedAt: null,
    };
    notificationTemplates.set(whatsapp.id, whatsapp);
    notificationTemplates.set(sms.id, sms);
  }
}
