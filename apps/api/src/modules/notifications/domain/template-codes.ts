/**
 * Codes des modèles système de la phase 3 (docs/api/phase3-contract.md,
 * § « Templates »). Chacun existe en WHATSAPP (modèle approuvé Meta) et en
 * SMS (texte court de repli, deux segments au plus).
 */
export const MESSAGE_TEMPLATE_CODES = {
  RECEIPT_ISSUED: 'RECEIPT_ISSUED',
  CASH_RECEIPT_ISSUED: 'CASH_RECEIPT_ISSUED',
  INVOICE_ISSUED: 'INVOICE_ISSUED',
  OTP_CODE: 'OTP_CODE',
  // --- Phase 4 : Mobile Money, virement déclaré -------------------------
  MOMO_DECLARATION_SUBMITTED: 'MOMO_DECLARATION_SUBMITTED',
  MOMO_DECLARATION_REJECTED: 'MOMO_DECLARATION_REJECTED',
  BANK_TRANSFER_SUBMITTED: 'BANK_TRANSFER_SUBMITTED',
  BANK_TRANSFER_REJECTED: 'BANK_TRANSFER_REJECTED',
} as const;

export type MessageTemplateCode =
  (typeof MESSAGE_TEMPLATE_CODES)[keyof typeof MESSAGE_TEMPLATE_CODES];

/** Modèles WhatsApp de catégorie Meta « Authentication » (bouton copier-le-code). */
const AUTHENTICATION_TEMPLATE_CODES: ReadonlySet<string> = new Set([
  MESSAGE_TEMPLATE_CODES.OTP_CODE,
]);

export function isAuthenticationTemplateCode(code: string): boolean {
  return AUTHENTICATION_TEMPLATE_CODES.has(code);
}

/**
 * Modèles dont le corps ne doit JAMAIS survivre en clair hors `otp_codes`
 * (haché) : aujourd'hui les seuls modèles « Authentication », mais nommé de
 * façon générique pour accueillir un futur modèle secret non lié à Meta
 * (ex: lien de réinitialisation) sans reprendre les appelants.
 */
export function isSecretTemplate(code: string): boolean {
  return isAuthenticationTemplateCode(code);
}
