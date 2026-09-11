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
} as const;

export type MessageTemplateCode =
  (typeof MESSAGE_TEMPLATE_CODES)[keyof typeof MESSAGE_TEMPLATE_CODES];
