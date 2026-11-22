import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DomainError } from '../../../shared/errors/domain-error';
import {
  OPENPAY_ORIGIN_APP,
  isOpenPayCashoutReference,
  isOpenPayPaymentReference,
  matchCashoutResponse,
  matchPaymentResponse,
  parseOpenPayTrigger,
  toOpenPayMsisdn,
  type OpenPayMatch,
} from '../domain/openpay-rules';
import type {
  InitiatePaymentInput,
  InitiateResult,
  MobileMoneyProvider,
  ParsedTrigger,
  ParsedWebhook,
  ProviderStatus,
  ProviderStatusExpectation,
  RawWebhook,
} from '../domain/ports';
import { isRecord } from '../domain/webhook-signature';
import {
  OPENPAY_ACTION_TIMEOUT_MS,
  OpenPayApiLimiter,
  OpenPayClient,
  type OpenPayResponse,
} from './openpay.client';

/** Un retrait programmé doit être daté au minimum 24 h après la requête (doc) : marge d'une heure. */
const CASHOUT_DELAY_MS = 25 * 3_600_000;

/**
 * Adaptateur OpenPay (Congo-Brazzaville ; XAF, opérateurs MTN et AIRTEL).
 *
 * Callbacks NON signés (`webhookTrust = 'UNSIGNED_TRIGGER'`) : `verifyWebhook`
 * refuse toujours, aucun corps n'est jamais traité comme authentique. Le
 * callback sert de déclencheur (`parseTrigger`), puis `getStatus` interroge
 * l'API authentifiée et exige une correspondance exacte avec la transaction.
 * Encaissement : `POST /transaction/payment` ; reversement : retrait
 * programmé (`POST /scheduled-cashout`), puis `execute` une fois approuvé.
 */
@Injectable()
export class OpenPayProvider implements MobileMoneyProvider {
  readonly code = 'OPENPAY' as const;
  readonly signatureHeader = 'x-openpay-signature';
  readonly webhookSource = 'OPENPAY' as const;
  readonly webhookTrust = 'UNSIGNED_TRIGGER' as const;
  /** `Idempotency-Key` : même clé et mêmes paramètres = la transaction d'origine, jamais recréée. */
  readonly idempotentInitiation = true;
  private readonly logger = new Logger(OpenPayProvider.name);

  constructor(
    private readonly client: OpenPayClient,
    private readonly limiter: OpenPayApiLimiter,
  ) {}

  /** La doc exige un UUID v4 pour la `reference` d'un retrait (jamais l'UUID v7 des identifiants Immodesk). */
  newPayoutReference(): string {
    return randomUUID();
  }

  async initiate(input: InitiatePaymentInput): Promise<InitiateResult> {
    return input.kind === 'PAYOUT' ? this.initiateCashout(input) : this.initiatePayment(input);
  }

  private async initiatePayment(input: InitiatePaymentInput): Promise<InitiateResult> {
    const response = await this.client.request({
      method: 'POST',
      path: '/transaction/payment',
      // Notre clé idempotente : un nouvel essai après délai dépassé ne débite pas deux fois.
      idempotencyKey: input.externalReference,
      timeoutMs: OPENPAY_ACTION_TIMEOUT_MS,
      body: {
        amount: Number(input.amount),
        payment_phone_number: toOpenPayMsisdn(input.payerMsisdn),
        provider: input.operator,
        metadata: { external_reference: input.externalReference },
      },
    });
    const body = response.body;
    if (response.status === 200 || response.status === 201) {
      if (isRecord(body) && isOpenPayPaymentReference(body.reference)) {
        const state =
          body.status === 'success'
            ? 'SUCCEEDED'
            : body.status === 'failed' || body.status === 'cancelled'
              ? 'FAILED'
              : 'PENDING';
        return { providerReference: body.reference, state, rawPayload: body };
      }
      throw new DomainError('MOMO.PROVIDER_UNAVAILABLE', { reason: 'référence OpenPay absente' });
    }
    if (response.status === 422) {
      // Même clé, paramètres différents : ne peut venir que d'une incohérence interne.
      throw new DomainError('MOMO.PROVIDER_UNAVAILABLE', { reason: 'clé d’idempotence refusée' });
    }
    // 400 : paramètres refusés (numéro, montant, opérateur) : échec définitif.
    return { providerReference: input.externalReference, state: 'FAILED', rawPayload: body };
  }

  private async initiateCashout(input: InitiatePaymentInput): Promise<InitiateResult> {
    if (!isOpenPayCashoutReference(input.externalReference)) {
      throw new DomainError('PLATFORM.INTERNAL_ERROR', {
        reason: 'référence de retrait : UUID v4 attendu',
      });
    }
    const response = await this.client.request({
      method: 'POST',
      path: '/scheduled-cashout',
      timeoutMs: OPENPAY_ACTION_TIMEOUT_MS,
      body: {
        amount: Number(input.amount),
        phone_number: toOpenPayMsisdn(input.payerMsisdn),
        provider: input.operator,
        execution_date: new Date(Date.now() + CASHOUT_DELAY_MS).toISOString(),
        origin_app: OPENPAY_ORIGIN_APP,
        reference: input.externalReference,
      },
    });
    // 409 : référence déjà utilisée = demande déjà créée (nouvel essai) ; statut relu ensuite.
    if (response.status === 200 || response.status === 201 || response.status === 409) {
      return {
        providerReference: input.externalReference,
        state: 'PENDING',
        rawPayload: response.body,
      };
    }
    return {
      providerReference: input.externalReference,
      state: 'FAILED',
      rawPayload: response.body,
    };
  }

  async getStatus(
    providerReference: string,
    expected?: ProviderStatusExpectation,
  ): Promise<ProviderStatus> {
    if (!expected) {
      throw new DomainError('PLATFORM.INTERNAL_ERROR', { reason: 'attendu requis pour OpenPay' });
    }
    const payout = expected.kind === 'PAYOUT';
    const reference = payout ? providerReference.toLowerCase() : providerReference;
    // Format vérifié avant tout appel : la référence entre dans le chemin de l'URL.
    if (payout ? !isOpenPayCashoutReference(reference) : !isOpenPayPaymentReference(reference)) {
      return this.unknown(providerReference, 'format de référence');
    }
    // Un décaissement et le rattrapage interne ont un budget réservé : le polling des clients ne
    // peut pas les rendre « indisponibles ».
    const priority = payout || expected.origin === 'RECONCILE';
    if (!(await this.limiter.tryAcquireStatusCall(priority ? 'PRIORITY' : 'STANDARD'))) {
      throw new DomainError('MOMO.PROVIDER_UNAVAILABLE', { reason: 'limite d’appels OpenPay' });
    }
    const response = await this.client.request({
      method: 'GET',
      path: payout ? `/scheduled-cashout/${reference}` : `/transaction/status/${reference}`,
    });
    return this.interpret(response, reference, expected);
  }

  async executePayout(
    providerReference: string,
    expected: ProviderStatusExpectation,
  ): Promise<ProviderStatus> {
    const reference = providerReference.toLowerCase();
    if (expected.kind !== 'PAYOUT' || !isOpenPayCashoutReference(reference)) {
      throw new DomainError('PLATFORM.INTERNAL_ERROR', { reason: 'execute : retrait attendu' });
    }
    const response = await this.client.request({
      method: 'POST',
      path: `/scheduled-cashout/${reference}/execute`,
      timeoutMs: OPENPAY_ACTION_TIMEOUT_MS,
    });
    // 400 (solde plateforme ou opérateur insuffisant, retrait non approuvé) et 404 : refus
    // métier DÉFINITIF de l'ordre (doc : erreurs fréquentes). Aucun virement n'est parti ; ce
    // n'est pas un statut du retrait : l'appelant relit le statut avant d'en tirer une conclusion.
    // Tout le reste (timeout, réseau, 5xx, 401/403/429) lève une erreur : issue INCERTAINE.
    if (response.status === 400 || response.status === 404) {
      this.logger.warn(
        `MOMO.OPENPAY_EXECUTE_REFUSED reference=${reference} HTTP ${response.status} : ordre refusé, aucun virement émis.`,
      );
      return {
        state: 'UNKNOWN',
        providerReference: reference,
        executeRefused: true,
        failureCode: 'OPENPAY_EXECUTE_REFUSED',
        failureMessage: `HTTP ${response.status}`,
        rawPayload: null,
      };
    }
    return this.interpret(response, reference, expected);
  }

  /**
   * `DELETE /scheduled-cashout/:reference` (doc : uniquement tant que le retrait est `pending`,
   * sinon HTTP 400). Seule la réponse `{ success: true }` vaut annulation ; toute autre réponse
   * métier (400, 404...) est « non annulable » et l'appelant ne doit pas expirer la transaction.
   * Une erreur technique (réseau, 5xx, 403...) est propagée.
   */
  async cancelPayout(providerReference: string): Promise<'CANCELLED' | 'NOT_CANCELLABLE'> {
    const reference = providerReference.toLowerCase();
    if (!isOpenPayCashoutReference(reference)) {
      throw new DomainError('PLATFORM.INTERNAL_ERROR', { reason: 'annulation : retrait attendu' });
    }
    const response = await this.client.request({
      method: 'DELETE',
      path: `/scheduled-cashout/${reference}`,
      timeoutMs: OPENPAY_ACTION_TIMEOUT_MS,
    });
    const cancelled =
      response.status === 200 && isRecord(response.body) && response.body.success === true;
    if (!cancelled) {
      this.logger.warn(
        `MOMO.OPENPAY_CANCEL_REFUSED reference=${reference} HTTP ${response.status}`,
      );
    }
    return cancelled ? 'CANCELLED' : 'NOT_CANCELLABLE';
  }

  private interpret(
    response: OpenPayResponse,
    reference: string,
    expected: ProviderStatusExpectation,
  ): ProviderStatus {
    if (response.status !== 200 && response.status !== 201) {
      const unknown = this.unknown(reference, `HTTP ${response.status}`);
      // 404 sur un retrait : le fournisseur ne le connaît pas (aucun virement possible).
      return response.status === 404 && expected.kind === 'PAYOUT'
        ? { ...unknown, notFound: true }
        : unknown;
    }
    const match: OpenPayMatch =
      expected.kind === 'PAYOUT'
        ? matchCashoutResponse(response.body, reference, expected)
        : matchPaymentResponse(response.body, reference, expected);
    if (match.ok) return match.status;
    this.logger.warn(
      `MOMO.OPENPAY_MISMATCH reference=${reference} champ=${match.reason} : réponse refusée, aucune confirmation.`,
    );
    return this.unknown(reference, `non conforme (${match.reason})`);
  }

  private unknown(providerReference: string, detail: string): ProviderStatus {
    return {
      state: 'UNKNOWN',
      providerReference,
      failureCode: 'OPENPAY_UNMATCHED',
      failureMessage: detail,
      rawPayload: null,
    };
  }

  /** Jamais « signé » : un callback OpenPay n'authentifie rien (chemin `parseTrigger`). */
  verifyWebhook(): boolean {
    return false;
  }

  parseTrigger(raw: RawWebhook): ParsedTrigger | null {
    try {
      return parseOpenPayTrigger(raw.body);
    } catch {
      return null;
    }
  }

  /** Contrat du port : un corps OpenPay n'est jamais normalisé en évènement de confiance. */
  parseWebhook(): ParsedWebhook {
    throw new DomainError('VALIDATION.INVALID_PAYLOAD', {
      reason: 'callback non signé : parseTrigger',
    });
  }
}
