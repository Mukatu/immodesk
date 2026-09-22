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
  {
    code: MESSAGE_TEMPLATE_CODES.MOMO_DECLARATION_SUBMITTED,
    channel: 'WHATSAPP',
    name: 'Déclaration Mobile Money reçue',
    body: '{{tenantName}} déclare un paiement Mobile Money de {{amount}} (réf. {{reference}}) à valider.',
    providerTemplateName: 'momo_declaration_fr',
    providerTemplateLang: 'fr',
    variables: ['tenantName', 'amount', 'reference'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.MOMO_DECLARATION_SUBMITTED,
    channel: 'SMS',
    name: 'Déclaration Mobile Money (SMS)',
    body: '{{tenantName}} declare {{amount}} Mobile Money, ref {{reference}}, a valider.',
    providerTemplateName: null,
    providerTemplateLang: null,
    variables: ['tenantName', 'amount', 'reference'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.MOMO_DECLARATION_REJECTED,
    channel: 'WHATSAPP',
    name: 'Déclaration Mobile Money rejetée',
    body: 'Votre déclaration de paiement Mobile Money de {{amount}} a été rejetée : {{reason}}.',
    providerTemplateName: 'momo_rejected_fr',
    providerTemplateLang: 'fr',
    variables: ['amount', 'reason'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.MOMO_DECLARATION_REJECTED,
    channel: 'SMS',
    name: 'Déclaration Mobile Money rejetée (SMS)',
    body: 'Paiement Mobile Money {{amount}} rejete : {{reason}}.',
    providerTemplateName: null,
    providerTemplateLang: null,
    variables: ['amount', 'reason'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.BANK_TRANSFER_SUBMITTED,
    channel: 'WHATSAPP',
    name: 'Déclaration de virement reçue',
    body: '{{tenantName}} déclare un virement de {{amount}} (réf. {{reference}}) à valider.',
    providerTemplateName: 'bank_transfer_declaration_fr',
    providerTemplateLang: 'fr',
    variables: ['tenantName', 'amount', 'reference'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.BANK_TRANSFER_SUBMITTED,
    channel: 'SMS',
    name: 'Déclaration de virement (SMS)',
    body: '{{tenantName}} declare un virement de {{amount}}, ref {{reference}}, a valider.',
    providerTemplateName: null,
    providerTemplateLang: null,
    variables: ['tenantName', 'amount', 'reference'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.BANK_TRANSFER_REJECTED,
    channel: 'WHATSAPP',
    name: 'Déclaration de virement rejetée',
    body: 'Votre déclaration de virement de {{amount}} a été rejetée : {{reason}}.',
    providerTemplateName: 'bank_transfer_rejected_fr',
    providerTemplateLang: 'fr',
    variables: ['amount', 'reason'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.BANK_TRANSFER_REJECTED,
    channel: 'SMS',
    name: 'Déclaration de virement rejetée (SMS)',
    body: 'Virement {{amount}} rejete : {{reason}}.',
    providerTemplateName: null,
    providerTemplateLang: null,
    variables: ['amount', 'reason'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.BANK_CHECK_BOUNCED,
    channel: 'WHATSAPP',
    name: 'Chèque impayé',
    body: 'Le chèque {{checkNumber}} de {{amount}} a été rejeté par la banque : {{reason}}.',
    providerTemplateName: 'bank_check_bounced_fr',
    providerTemplateLang: 'fr',
    variables: ['checkNumber', 'amount', 'reason'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.BANK_CHECK_BOUNCED,
    channel: 'SMS',
    name: 'Chèque impayé (SMS)',
    body: 'Cheque {{checkNumber}} de {{amount}} rejete : {{reason}}.',
    providerTemplateName: null,
    providerTemplateLang: null,
    variables: ['checkNumber', 'amount', 'reason'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.BANK_CHECK_UNCLEARED,
    channel: 'WHATSAPP',
    name: 'Chèque en attente de compensation',
    body: 'Le chèque {{checkNumber}} de {{amount}}, déposé le {{depositDate}}, attend toujours sa compensation.',
    providerTemplateName: 'bank_check_uncleared_fr',
    providerTemplateLang: 'fr',
    variables: ['checkNumber', 'amount', 'depositDate'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.BANK_CHECK_UNCLEARED,
    channel: 'SMS',
    name: 'Chèque en attente de compensation (SMS)',
    body: 'Cheque {{checkNumber}} de {{amount}} depose le {{depositDate}} : compensation toujours en attente.',
    providerTemplateName: null,
    providerTemplateLang: null,
    variables: ['checkNumber', 'amount', 'depositDate'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.LANDLORD_PORTAL_INVITE,
    channel: 'WHATSAPP',
    name: 'Invitation au portail bailleur',
    body: 'Bonjour, votre gestionnaire vous invite à suivre vos encaissements et relevés en ligne. Activez votre accès : {{link}}',
    providerTemplateName: 'landlord_portal_invite_fr',
    providerTemplateLang: 'fr',
    variables: ['link'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.LANDLORD_PORTAL_INVITE,
    channel: 'SMS',
    name: 'Invitation au portail bailleur (SMS)',
    body: 'Immodesk : activez votre acces bailleur pour suivre vos encaissements. {{link}}',
    providerTemplateName: null,
    providerTemplateLang: null,
    variables: ['link'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.OWNER_STATEMENT_READY,
    channel: 'WHATSAPP',
    name: 'Relevé de gérance disponible',
    body: 'Bonjour {{landlordName}}, votre relevé de gérance {{statementNumber}} ({{period}}) est disponible. Net à reverser : {{netAmount}}. Document : {{link}}',
    providerTemplateName: 'owner_statement_ready_fr',
    providerTemplateLang: 'fr',
    variables: ['landlordName', 'statementNumber', 'period', 'netAmount', 'link'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.OWNER_STATEMENT_READY,
    channel: 'SMS',
    name: 'Relevé de gérance disponible (SMS)',
    body: 'Immodesk : relevé {{statementNumber}} ({{period}}) disponible, net a reverser {{netAmount}}. {{link}}',
    providerTemplateName: null,
    providerTemplateLang: null,
    variables: ['statementNumber', 'period', 'netAmount', 'link'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.PAYOUT_BANK_DETAILS_MISSING,
    channel: 'WHATSAPP',
    name: 'Reversement bloqué : coordonnées manquantes',
    body: 'Reversement {{reference}} bloqué : coordonnées de {{landlordName}} absentes ou incomplètes pour {{method}}. À compléter avant nouvelle tentative.',
    providerTemplateName: 'payout_bank_details_missing_fr',
    providerTemplateLang: 'fr',
    variables: ['reference', 'landlordName', 'method'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.PAYOUT_BANK_DETAILS_MISSING,
    channel: 'SMS',
    name: 'Reversement bloqué : coordonnées manquantes (SMS)',
    body: 'Immodesk : reversement {{reference}} bloque, coordonnees {{landlordName}} incompletes ({{method}}).',
    providerTemplateName: null,
    providerTemplateLang: null,
    variables: ['reference', 'landlordName', 'method'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.SUBSCRIPTION_PAST_DUE_WARNING,
    channel: 'WHATSAPP',
    name: 'Avertissement avant restriction (abonnement en retard)',
    body: 'Bonjour {{ownerName}}, l’abonnement Immodesk de {{organizationName}} est en retard de paiement ({{amount}}). Réglez avant le {{deadline}} pour éviter la mise en lecture seule de votre compte. Payer : {{link}}',
    providerTemplateName: 'subscription_past_due_warning_fr',
    providerTemplateLang: 'fr',
    variables: ['ownerName', 'organizationName', 'amount', 'deadline', 'link'],
  },
  {
    code: MESSAGE_TEMPLATE_CODES.SUBSCRIPTION_PAST_DUE_WARNING,
    channel: 'SMS',
    name: 'Avertissement avant restriction (abonnement en retard, SMS)',
    body: 'Immodesk : abonnement {{organizationName}} en retard de {{amount}}. Reglez avant le {{deadline}} pour eviter la restriction du compte.',
    providerTemplateName: null,
    providerTemplateLang: null,
    variables: ['organizationName', 'amount', 'deadline'],
  },
];

export function systemTemplate(code: string, channel: string): SystemTemplate | null {
  return SYSTEM_TEMPLATES.find((t) => t.code === code && t.channel === channel) ?? null;
}
