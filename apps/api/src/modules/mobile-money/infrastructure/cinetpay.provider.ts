import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import {
  cinetpaySignaturePayload,
  CINETPAY_CHECK_PATH,
  CINETPAY_INIT_PATH,
  type CinetPayCheckResponse,
  type CinetPayInitResponse,
  type CinetPayNotification,
} from './cinetpay-field-map';
import type {
  InitiatePaymentInput,
  InitiateResult,
  MobileMoneyProvider,
  ParsedWebhook,
  ProviderStatus,
  RawWebhook,
} from '../domain/ports';
import { isRecord, safeEqual, signHmac } from '../domain/webhook-signature';

/**
 * Adaptateur CinetPay (contrat phase 4, § « CinetPay »). Écrit et testable
 * unitairement (analyse de webhook, calcul de signature) mais non activé en
 * production tant que le contrat commercial n'est pas signé (double verrou :
 * `feature_flags.payments.mobile_money_aggregator` ET
 * `paymentMethods.mobileMoneyAggregator.provider = 'CINETPAY'`).
 */
@Injectable()
export class CinetPayProvider implements MobileMoneyProvider {
  readonly code = 'CINETPAY' as const;
  readonly signatureHeader = 'x-token';
  readonly webhookSource = 'CINETPAY' as const;
  private readonly logger = new Logger(CinetPayProvider.name);

  constructor(private readonly config: AppConfigService) {}

  async initiate(input: InitiatePaymentInput): Promise<InitiateResult> {
    // Échec fermé, avant tout appel : sans `notify_url`, CinetPay ne rappellerait
    // jamais l'API et le payeur recevrait un push pour un paiement jamais confirmé.
    if (!input.callbackUrl) {
      throw new DomainError('PLATFORM.INTERNAL_ERROR', { reason: 'notify_url absent' });
    }
    const body = {
      apikey: this.requireKey('CINETPAY_API_KEY'),
      site_id: this.requireKey('CINETPAY_SITE_ID'),
      transaction_id: input.externalReference,
      amount: Number(input.amount),
      currency: input.currency,
      description: input.description,
      notify_url: input.callbackUrl,
      channels: 'MOBILE_MONEY',
      customer_phone_number: input.payerMsisdn,
    };
    const response = await this.post<CinetPayInitResponse>(CINETPAY_INIT_PATH, body);
    if (response.code !== '201' && response.code !== '200') {
      return { providerReference: input.externalReference, state: 'FAILED', rawPayload: response };
    }
    return { providerReference: input.externalReference, state: 'PENDING', rawPayload: response };
  }

  async getStatus(providerReference: string): Promise<ProviderStatus> {
    const body = {
      apikey: this.requireKey('CINETPAY_API_KEY'),
      site_id: this.requireKey('CINETPAY_SITE_ID'),
      transaction_id: providerReference,
    };
    const response = await this.post<CinetPayCheckResponse>(CINETPAY_CHECK_PATH, body);
    const data = response.data;
    if (!data) return { state: 'UNKNOWN', providerReference, rawPayload: response };
    const state = data.cpm_result === '00' ? 'SUCCEEDED' : data.cpm_result ? 'FAILED' : 'PENDING';
    return {
      state,
      providerReference,
      amount: BigInt(Math.trunc(Number(data.cpm_amount))),
      currency: data.cpm_currency,
      failureMessage: data.cpm_error_message,
      rawPayload: response,
    };
  }

  parseWebhook(raw: RawWebhook): ParsedWebhook {
    const body = raw.body;
    if (!isRecord(body) || typeof body.cpm_trans_id !== 'string' || body.cpm_trans_id === '') {
      throw new DomainError('VALIDATION.INVALID_PAYLOAD', { reason: 'cpm_trans_id absent' });
    }
    return {
      externalReference: body.cpm_trans_id,
      providerReference: body.cpm_trans_id,
      state: body.cpm_result === '00' ? 'SUCCEEDED' : 'FAILED',
      amount: body.cpm_amount ? BigInt(Math.trunc(Number(body.cpm_amount))) : undefined,
      currency: typeof body.cpm_currency === 'string' ? body.cpm_currency : undefined,
    };
  }

  verifyWebhook(raw: RawWebhook): boolean {
    // Ne jette jamais (contrat du port) : un corps `null`, un secret absent ou
    // tout autre défaut valent « non signé », jamais une erreur 500.
    try {
      const header = raw.headers[this.signatureHeader];
      const token = Array.isArray(header) ? header[0] : header;
      if (!token || !isRecord(raw.body)) return false;
      const secret = this.config.get('CINETPAY_SECRET_KEY');
      if (!secret) {
        this.logger.error('CINETPAY_SECRET_KEY absent : webhook non vérifiable, refusé.');
        return false;
      }
      const expected = signHmac(
        cinetpaySignaturePayload(raw.body as unknown as CinetPayNotification),
        secret,
      );
      // Temps constant : une comparaison `===` s'arrête au premier octet
      // différent et laisse mesurer, octet par octet, la signature attendue.
      return safeEqual(token, expected);
    } catch {
      return false;
    }
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(`${this.config.get('CINETPAY_BASE_URL')}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      return (await response.json()) as T;
    } catch (error) {
      this.logger.error(`Appel CinetPay ${path} indisponible : ${String(error)}`);
      throw new DomainError('MOMO.PROVIDER_UNAVAILABLE', { path });
    } finally {
      clearTimeout(timeout);
    }
  }

  private requireKey(
    name: 'CINETPAY_API_KEY' | 'CINETPAY_SITE_ID' | 'CINETPAY_SECRET_KEY',
  ): string {
    const value = this.config.get(name);
    if (!value) throw new DomainError('PLATFORM.INTERNAL_ERROR', { reason: `${name} absent` });
    return value;
  }
}
