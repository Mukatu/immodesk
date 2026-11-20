import { Injectable, Logger } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import {
  OPENPAY_ORIGIN_APP,
  isOpenPayPaymentReference,
  isOpenPayUuid,
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
  private readonly logger = new Logger(OpenPayProvider.name);

  constructor(
    private readonly client: OpenPayClient,
    private readonly limiter: OpenPayApiLimiter,
  ) {}

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
    if (!isOpenPayUuid(input.externalReference)) {
      throw new DomainError('PLATFORM.INTERNAL_ERROR', { reason: 'référence de retrait non UUID' });
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
    if (payout ? !isOpenPayUuid(reference) : !isOpenPayPaymentReference(reference)) {
      return this.unknown(providerReference, 'format de référence');
    }
    if (!(await this.limiter.tryAcquireStatusCall())) {
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
    if (expected.kind !== 'PAYOUT' || !isOpenPayUuid(reference)) {
      throw new DomainError('PLATFORM.INTERNAL_ERROR', { reason: 'execute : retrait attendu' });
    }
    const response = await this.client.request({
      method: 'POST',
      path: `/scheduled-cashout/${reference}/execute`,
      timeoutMs: OPENPAY_ACTION_TIMEOUT_MS,
    });
    return this.interpret(response, reference, expected);
  }

  private interpret(
    response: OpenPayResponse,
    reference: string,
    expected: ProviderStatusExpectation,
  ): ProviderStatus {
    if (response.status !== 200 && response.status !== 201) {
      return this.unknown(reference, `HTTP ${response.status}`);
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
