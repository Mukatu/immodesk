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
  /**
   * `external_reference` Immodesk : clé unique sur toute la plateforme,
   * idempotente côté fournisseur. JAMAIS la `merchant_reference`, numérotée
   * par organisation et donc partagée entre organisations.
   */
  externalReference: string;
  description: string;
  /**
   * `notify_url` propre à la transaction (même URL pour tous les usages, le
   * routage se fait par `purpose`). Tout fournisseur réel doit la transmettre
   * et refuser d'initier si elle est vide.
   */
  callbackUrl: string;
  /**
   * `COLLECTION` (défaut) : encaissement d'un payeur. `PAYOUT` : décaissement
   * vers un bénéficiaire (reversement) ; un fournisseur qui expose une API de
   * décaissement distincte (OpenPay : retrait programmé) l'utilise.
   */
  kind?: 'COLLECTION' | 'PAYOUT';
}

/**
 * Ce que NOUS attendons d'une transaction, lu en base. Un fournisseur dont le
 * webhook n'est pas signé s'en sert pour exiger que la réponse de son API
 * corresponde exactement (référence, type, montant, devise, metadata).
 */
export interface ProviderStatusExpectation {
  kind: 'COLLECTION' | 'PAYOUT';
  /** `mobile_money_transactions.external_reference` (clé Immodesk). */
  externalReference: string;
  amount: bigint;
  currency: string;
  /** Numéro E.164 du payeur (collecte) ou du bénéficiaire (reversement). */
  msisdn?: string;
  /**
   * Origine de la vérification (budget d'appels du fournisseur) : un rattrapage interne
   * (`RECONCILE`) et tout décaissement ont leur propre budget, que le polling des
   * utilisateurs ne peut pas épuiser.
   */
  origin?: 'CALLBACK' | 'REFRESH' | 'RECONCILE';
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
  /**
   * Retrait approuvé par le fournisseur, en attente de notre ordre d'exécution
   * (OpenPay : `scheduled_cashout` approuvé, puis `execute`).
   */
  nextAction?: 'EXECUTE';
  /**
   * Retrait (OpenPay) : statut documenté tel que le fournisseur le rapporte, seulement quand la
   * réponse correspond exactement à la transaction attendue. Sert aux décisions humaines
   * (résolution d'un décaissement bloqué), jamais à conclure une ligne.
   */
  cashoutStatus?: 'pending' | 'approved' | 'completed' | 'cancelled' | 'rejected';
  /** Le fournisseur ne connaît pas cette référence (HTTP 404) : aucun retrait, donc aucun virement. */
  notFound?: boolean;
  /**
   * `executePayout` seulement : le fournisseur a REFUSÉ définitivement l'ordre (HTTP 400 : solde
   * insuffisant, retrait non approuvé ; 404 : inconnu). Aucun virement n'est parti ; le statut
   * du retrait doit être relu avant d'en conclure quoi que ce soit.
   */
  executeRefused?: boolean;
  /**
   * Fournisseur à webhook non signé : la réponse correspond exactement à la
   * transaction attendue. Seule une réponse conforme rattache l'événement reçu
   * à l'organisation.
   */
  matched?: boolean;
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
  /** `external_reference` Immodesk, retrouvée dans le corps (externalReference envoyée à `initiate`). */
  externalReference: string;
  providerReference: string;
  state: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  amount?: bigint;
  currency?: string;
}

/** Déclencheur extrait d'un callback non signé : rien d'autre n'en est lu. */
export interface ParsedTrigger {
  reference: string;
  type: 'payment' | 'scheduled_cashout';
  /** `metadata.external_reference` : simple indice de recherche, jamais une preuve. */
  externalReferenceHint?: string;
}

export interface MobileMoneyProvider {
  readonly code: 'SIMULATOR' | 'CINETPAY' | 'OPENPAY' | 'PAWAPAY' | 'MTN_MOMO' | 'AIRTEL_MONEY';

  /** En-tête (minuscules) qui porte la signature du webhook de ce fournisseur. */
  readonly signatureHeader: string;

  /** Valeur de `webhook_events.source` pour les webhooks de ce fournisseur. */
  readonly webhookSource: 'CINETPAY' | 'OPENPAY' | 'OTHER';

  /**
   * Confiance accordée au webhook de ce fournisseur.
   * - `SIGNED` : la signature authentifie le corps (chemin « signature valide »).
   * - `UNSIGNED_TRIGGER` : aucun secret partagé ; le webhook n'est qu'un
   *   déclencheur. Il ne passe JAMAIS par le chemin « signature valide » :
   *   seules `reference` et `type` sont lues, puis la transaction est
   *   re-interrogée (`getStatus`) et comparée à l'attendu.
   */
  readonly webhookTrust: 'SIGNED' | 'UNSIGNED_TRIGGER';

  /** Déclenche le push USSD/STK sur le téléphone du payeur. */
  initiate(input: InitiatePaymentInput): Promise<InitiateResult>;

  /** Source de vérité : interroge le fournisseur. Aucune confirmation sans cet appel. */
  getStatus(
    providerReference: string,
    expected?: ProviderStatusExpectation,
  ): Promise<ProviderStatus>;

  /**
   * Retrait approuvé : ordre d'exécution du virement. Facultatif (OpenPay).
   * L'appelant ne l'invoque que pour une transaction OWNER_PAYOUT existante, à
   * l'état attendu, dont `getStatus` a déjà confirmé le montant.
   */
  executePayout?(
    providerReference: string,
    expected: ProviderStatusExpectation,
  ): Promise<ProviderStatus>;

  /**
   * Annule un retrait programmé encore en attente d'approbation (OpenPay :
   * `DELETE /scheduled-cashout/:reference`, uniquement tant qu'il est `pending`).
   * `NOT_CANCELLABLE` : le fournisseur refuse (déjà approuvé, exécuté, annulé ou
   * inconnu) : l'appelant ne doit alors PAS expirer la transaction.
   */
  cancelPayout?(providerReference: string): Promise<'CANCELLED' | 'NOT_CANCELLABLE'>;

  /**
   * Référence propre au fournisseur pour un décaissement, quand sa documentation en
   * impose le format (OpenPay : UUID v4). Absent : `external_reference` = id de la transaction.
   */
  newPayoutReference?(): string;

  /**
   * `true` si rejouer `initiate()` avec la même `externalReference` et les mêmes paramètres
   * renvoie la transaction d'origine sans la recréer (OpenPay : en-tête `Idempotency-Key`).
   * Le rattrapage s'en sert pour retrouver la référence d'une initiation dont la réponse est perdue.
   */
  readonly idempotentInitiation?: boolean;

  /**
   * Normalise un corps de webhook hétérogène vers un évènement interne.
   * CONTRAT pour tout fournisseur : lever une `DomainError` contrôlée
   * (`VALIDATION.INVALID_PAYLOAD`) si le corps n'est pas un objet ou n'a pas
   * la référence attendue, jamais une TypeError. L'ingestion la capte.
   */
  parseWebhook(raw: RawWebhook): ParsedWebhook;

  /**
   * Vérifie signature HMAC, horodatage et anti-rejeu. Retourne un booléen,
   * ne jette JAMAIS, quel que soit le corps (null, tableau, scalaire) ou la
   * configuration (secret absent : journalisé, puis `false`).
   */
  verifyWebhook(raw: RawWebhook): boolean;

  /**
   * `UNSIGNED_TRIGGER` seulement : extrait `reference` et `type` avec une
   * validation stricte du format (statut, montant et client ignorés). Retourne
   * `null` si le corps n'est pas conforme ; ne jette jamais.
   */
  parseTrigger?(raw: RawWebhook): ParsedTrigger | null;
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
  /** Numéro de tentative (1 par défaut) : suffixe de `merchant_reference` après un échec terminal. */
  attempt?: number;
}

export interface MobileMoneyPayoutResult {
  momoTransactionId: string;
  providerReference: string;
  state: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  /** Agrégateur qui porte la transaction (annulation d'un retrait orphelin). */
  aggregator?: string;
}

/**
 * Résolution humaine d'un décaissement bloqué (issue incertaine), après vérification chez le
 * fournisseur : `RETRY` lève le marqueur d'exécution (l'ordre ne repartira que si le statut
 * relu est `approved`), `MARK_PAID` / `MARK_FAILED` concluent la transaction.
 */
export type MobileMoneyPayoutResolution = 'RETRY' | 'MARK_PAID' | 'MARK_FAILED';

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

  /**
   * Annule au mieux (journalisé) un retrait créé chez le fournisseur dont la transaction
   * Immodesk est annulée juste après (rollback) : évite un retrait orphelin.
   */
  discardOrphanPayout(result: MobileMoneyPayoutResult): Promise<void>;

  /**
   * Action d'administration sur un décaissement bloqué (issue incertaine d'un ordre d'exécution).
   * Aucun virement n'est jamais émis par cet appel.
   */
  /**
   * Relit le statut du retrait d'une ancienne tentative marquée échouée à la main : lève
   * `MOMO.RESOLUTION_REFUSED` sauf preuve (annulé, rejeté, inconnu) qu'aucun virement n'est parti.
   */
  assertNoTransferSent(tx: TenantClient, momoTransactionId: string): Promise<void>;

  resolveBlockedPayout(
    tx: TenantClient,
    momoTransactionId: string,
    resolution: MobileMoneyPayoutResolution,
  ): Promise<{
    previousStatus: string;
    status: string;
    markerCleared: boolean;
    /** Statut relu chez le fournisseur pour décider (conservé dans l'audit). */
    providerStatus: string;
  }>;
}

/**
 * Un décaissement peut se conclure bien après l'appel de `owner-payouts` (OpenPay :
 * approbation puis exécution, par callback ou rattrapage). `owner-payouts` s'inscrit
 * auprès de `mobile-money` pour répercuter l'issue sur le reversement, sans que
 * `mobile-money` n'importe `owner-payouts` (aucun cycle de modules).
 */
export const MOMO_PAYOUT_OUTCOME_REGISTRY = Symbol('MOMO_PAYOUT_OUTCOME_REGISTRY');

export interface MobileMoneyPayoutOutcome {
  organizationId: string;
  momoTransactionId: string;
  state: 'SUCCEEDED' | 'FAILED' | 'EXPIRED';
  /** `MANUAL_RESOLUTION` : conclu par un administrateur ; absent : callback ou rattrapage. */
  source?: 'MANUAL_RESOLUTION';
}

export type MobileMoneyPayoutOutcomeListener = (
  tx: TenantClient,
  outcome: MobileMoneyPayoutOutcome,
) => Promise<void>;

export interface MobileMoneyPayoutOutcomeRegistry {
  onPayoutOutcome(listener: MobileMoneyPayoutOutcomeListener): void;
}
