import { MESSAGE_TEMPLATE_CODES, type MessageTemplateCode } from './template-codes';

export interface SystemTemplate {
  code: MessageTemplateCode;
  channel: 'WHATSAPP' | 'SMS';
  name: string;
  body: string;
  /** Nom du modèle approuvé par Meta (WhatsApp), `null` pour un SMS. */
  providerTemplateName: string | null;
  providerTemplateLang: string | null;
  /** Variables, dans l'ordre des paramètres positionnels du modèle Meta. */
  variables: string[];
}

/**
 * Modèles système semés dans chaque organisation (modifiables ensuite).
 *
 * Les corps WhatsApp reproduisent le texte soumis à Meta : toute modification
 * EXIGE une nouvelle approbation (architecture, § 9.3). Les SMS restent sans
 * accent décoratif pour tenir en GSM-7 et en deux segments au plus : un
 * accent bascule le message en UCS-2 et en divise la capacité par deux.
 */
export const SYSTEM_TEMPLATES: readonly SystemTemplate[] = [
  {
    code: MESSAGE_TEMPLATE_CODES.RECEIPT_ISSUED,
    channel: 'WHATSAPP',
    name: 'Quittance de loyer disponible',
    body: 'Bonjour {{tenantName}}, votre quittance {{receiptNumber}} pour {{period}} ({{amount}}) est disponible. Vérification : {{link}}',
    providerTemplateName: 'receipt_ready_fr',
    providerTemplateLang: 'fr',
    variables: ['tenantName', 'receiptNumber', 'period', 'amount', 'link'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.RECEIPT_ISSUED,
    channel: 'SMS',
    name: 'Quittance de loyer (SMS)',
    body: 'Quittance {{receiptNumber}} {{period}} : {{amount}} regle. PDF : {{pdfLink}} Verifier : {{link}}',
    providerTemplateName: null,
    providerTemplateLang: null,
    variables: ['receiptNumber', 'period', 'amount', 'pdfLink', 'link'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.CASH_RECEIPT_ISSUED,
    channel: 'WHATSAPP',
    name: 'Reçu de caisse',
    body: 'Bonjour {{tenantName}}, {{organizationName}} confirme avoir reçu {{amount}} en espèces (reçu {{receiptNumber}}).',
    providerTemplateName: 'cash_receipt_fr',
    providerTemplateLang: 'fr',
    variables: ['tenantName', 'organizationName', 'amount', 'receiptNumber'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.CASH_RECEIPT_ISSUED,
    channel: 'SMS',
    name: 'Reçu de caisse (SMS)',
    body: '{{organizationName}} : recu {{receiptNumber}} de {{amount}} en especes. {{pdfLink}}',
    providerTemplateName: null,
    providerTemplateLang: null,
    variables: ['organizationName', 'receiptNumber', 'amount', 'pdfLink'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.INVOICE_ISSUED,
    channel: 'WHATSAPP',
    name: 'Avis d’échéance',
    body: 'Bonjour {{tenantName}}, votre loyer {{period}} de {{amount}} (facture {{invoiceNumber}}) est à régler avant le {{dueDate}}. {{organizationName}}',
    providerTemplateName: 'rent_due_reminder_fr',
    providerTemplateLang: 'fr',
    variables: ['tenantName', 'period', 'amount', 'invoiceNumber', 'dueDate', 'organizationName'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.INVOICE_ISSUED,
    channel: 'SMS',
    name: 'Avis d’échéance (SMS)',
    body: '{{organizationName}} : loyer {{period}} {{amount}}, facture {{invoiceNumber}}, a regler avant le {{dueDate}}.',
    providerTemplateName: null,
    providerTemplateLang: null,
    variables: ['organizationName', 'period', 'amount', 'invoiceNumber', 'dueDate'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.OTP_CODE,
    channel: 'WHATSAPP',
    name: 'Code de connexion',
    body: 'Votre code de connexion Immodesk est {{code}}. Il expire dans {{minutes}} minutes.',
    providerTemplateName: 'otp_code_fr',
    providerTemplateLang: 'fr',
    variables: ['code', 'minutes'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.OTP_CODE,
    channel: 'SMS',
    name: 'Code de connexion (SMS)',
    body: 'Immodesk : votre code est {{code}}. Il expire dans {{minutes}} min. Ne le communiquez a personne.',
    providerTemplateName: null,
    providerTemplateLang: null,
    variables: ['code', 'minutes'],
  },
];

export function systemTemplate(code: string, channel: string): SystemTemplate | null {
  return SYSTEM_TEMPLATES.find((t) => t.code === code && t.channel === channel) ?? null;
}
