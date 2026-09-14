/**
 * Port `MobileMoneyProvider` (architecture §8.2.2, contrat phase 4).
 *
 * Le fournisseur est un détail d'infrastructure : le domaine et
 * l'application ne connaissent que ce port. Chaque implémentation vit dans
 * `infrastructure/` ; aucun `if (provider === 'CINETPAY')` n'est autorisé
 * ailleurs.
 */
export interface InitiatePaymentInput {
  amount: bigint;
  currency: 'XAF';
  payerMsisdn: string;
  operator: 'MTN' | 'AIRTEL';
  /** `merchant_reference` Immodesk : idempotent côté fournisseur. */
  externalReference: string;
  description: string;
  callbackUrl: string;
}

export interface InitiateResult {
  providerReference: string;
  state: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  rawPayload: unknown;
}

export interface ProviderStatus {
  state: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED' | 'UNKNOWN';
  providerReference: string;
  operatorReference?: string;
  amount?: bigint;
  currency?: string;
  feeAmount?: bigint;
  failureCode?: string;
  failureMessage?: string;
  rawPayload: unknown;
}

export interface RawWebhook {
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  rawBody: Buffer;
}

export interface ParsedWebhook {
  /** Identifiant d'évènement fourni par le fournisseur, sinon calculé (SHA-256 du corps) en amont. */
  eventId?: string;
  /** `merchant_reference` Immodesk, retrouvée dans le corps (externalReference envoyée à `initiate`). */
  merchantReference: string;
  providerReference: string;
  state: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  amount?: bigint;
  currency?: string;
}

export interface MobileMoneyProvider {
  readonly code: 'SIMULATOR' | 'CINETPAY' | 'PAWAPAY' | 'MTN_MOMO' | 'AIRTEL_MONEY';

  /** Déclenche le push USSD/STK sur le téléphone du payeur. */
  initiate(input: InitiatePaymentInput): Promise<InitiateResult>;

  /** Source de vérité : interroge le fournisseur. Aucune confirmation sans cet appel. */
  getStatus(providerReference: string): Promise<ProviderStatus>;

  /** Normalise un corps de webhook hétérogène vers un évènement interne. */
  parseWebhook(raw: RawWebhook): ParsedWebhook;

  /** Vérifie signature HMAC, horodatage et anti-rejeu. Retourne un booléen, ne jette pas. */
  verifyWebhook(raw: RawWebhook): boolean;
}
