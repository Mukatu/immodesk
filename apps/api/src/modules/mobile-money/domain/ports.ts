import type { TenantClient } from '../../../shared/prisma/prisma.service';

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

/**
 * Port phase 7 : décaissement Mobile Money vers un bailleur (contrat,
 * § Reversements — « l'exécution passe par `MobileMoneyProvider` et
 * `momo_transaction_id` »). Consommé par `owner-payouts`, comme
 * `COMMISSION_CANCELLER` (`payments/domain/ports.ts`) est consommé par
 * `payments` : jeton `Symbol` déclaré ici pour que `mobile-money` reste
 * l'unique propriétaire de `mobile_money_transactions`.
 *
 * LIMITATION ASSUMÉE ET DOCUMENTÉE : `MobileMoneyProvider.initiate()` a été
 * conçu en phase 4 pour l'ENCAISSEMENT (push USSD/STK vers un payeur qui
 * règle une facture). Aucun agrégateur Mobile Money congolais n'expose
 * aujourd'hui d'API de DÉCAISSEMENT dédiée derrière cette même interface ; en
 * l'absence d'alternative, `MomoPayoutService` réutilise pragmatiquement
 * `initiate()` en passant le numéro du BÉNÉFICIAIRE du reversement dans le
 * champ `payerMsisdn` (nom hérité de la collecte, sémantiquement inversé
 * ici). Si un agrégateur ajoute un jour une vraie API de décaissement, seule
 * l'implémentation de ce port change — jamais `owner-payouts`.
 */
export const MOMO_PAYOUT_INITIATOR = Symbol('MOMO_PAYOUT_INITIATOR');

export interface MobileMoneyPayoutInput {
  organizationId: string;
  amount: bigint;
  currency: 'XAF';
  /** Numéro Mobile Money du BÉNÉFICIAIRE du reversement (voir limitation ci-dessus). */
  payerMsisdn: string;
  /** `owner_payouts.reference` (`REV-{YYYYMM}-{seq}`) : `merchant_reference` de la transaction. */
  externalReference: string;
  description: string;
}

export interface MobileMoneyPayoutResult {
  momoTransactionId: string;
  providerReference: string;
  state: 'PENDING' | 'SUCCEEDED' | 'FAILED';
}

export interface MobileMoneyPayoutInitiator {
  /** Crée la transaction (`mobile_money_transactions`, `direction = OUTBOUND`) et l'initie. */
  initiatePayout(tx: TenantClient, input: MobileMoneyPayoutInput): Promise<MobileMoneyPayoutResult>;

  /**
   * Ré-interroge une transaction déjà initiée (contrat : nouvelle tentative
   * sans recréer le reversement), sans jamais se fier au seul webhook
   * (architecture §8.2.2 : re-interrogation systématique côté agrégateur).
   */
  refreshPayoutStatus(
    tx: TenantClient,
    momoTransactionId: string,
  ): Promise<MobileMoneyPayoutResult>;
}
