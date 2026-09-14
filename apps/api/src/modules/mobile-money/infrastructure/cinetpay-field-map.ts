/**
 * Correspondance des champs de l'API CinetPay.
 *
 * Isolée dans CE SEUL fichier (contrat phase 4, § « CinetPay ») : les noms
 * exacts n'ont pas pu être vérifiés sans compte marchand actif au moment de
 * l'écriture. À CONFIRMER AVEC LA DOCUMENTATION MARCHANDE avant activation
 * en production (voir README, § « Activer le mode agrégateur »).
 *
 * Sources publiques utilisées pour ce brouillon : documentation CinetPay
 * « API de paiement » (initialisation `POST /v2/payment`, vérification
 * `POST /v2/payment/check`, notification HTTP signée par un jeton HMAC dans
 * l'en-tête `x-token`, calculé sur une chaîne de champs concaténés).
 */
export const CINETPAY_INIT_PATH = '/v2/payment';
export const CINETPAY_CHECK_PATH = '/v2/payment/check';

export interface CinetPayInitRequest {
  apikey: string;
  site_id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  description: string;
  notify_url: string;
  channels: string;
  customer_phone_number: string;
}

export interface CinetPayInitResponse {
  code: string;
  message: string;
  data?: { payment_token: string; payment_url: string };
}

export interface CinetPayCheckRequest {
  apikey: string;
  site_id: string;
  transaction_id: string;
}

/** `cpm_result` : `00` succès, `600`+ nuances d'échec (à confirmer). */
export interface CinetPayCheckResponse {
  code: string;
  message: string;
  data?: {
    cpm_trans_id: string;
    cpm_amount: string;
    cpm_currency: string;
    cpm_result: string;
    cpm_error_message?: string;
  };
}

/** Corps du webhook de notification CinetPay (POST, `x-token` signé). */
export interface CinetPayNotification {
  cpm_site_id: string;
  cpm_trans_id: string;
  cpm_amount: string;
  cpm_currency: string;
  cpm_result?: string;
}

/**
 * Champs concaténés pour le calcul du jeton HMAC `x-token` (ordre et liste
 * À CONFIRMER : reconstitué à partir de la documentation publique du champ
 * « HashValidation », non vérifié en environnement réel).
 */
export function cinetpaySignaturePayload(notification: CinetPayNotification): string {
  return [
    notification.cpm_site_id,
    notification.cpm_trans_id,
    notification.cpm_amount,
    notification.cpm_currency,
  ].join('');
}
