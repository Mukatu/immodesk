import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import type {
  InitiatePaymentInput,
  InitiateResult,
  MobileMoneyProvider,
  ParsedWebhook,
  ProviderStatus,
  RawWebhook,
} from '../domain/ports';
import { signHmac, verifyHmacSignature } from '../domain/webhook-signature';

interface SimulatedTransaction {
  amount: bigint;
  currency: string;
  suffix: string;
}

/**
 * Fournisseur simulé (développement, tests, CI), piloté par les deux
 * derniers chiffres du numéro payeur (contrat phase 4, § « Simulateur »).
 * Le comportement de `getStatus` est la source de vérité, jamais le seul
 * webhook — conforme à l'invariant 2 de l'architecture (§8.5).
 */
@Injectable()
export class SimulatedMobileMoneyProvider implements MobileMoneyProvider {
  readonly code = 'SIMULATOR' as const;
  private readonly logger = new Logger(SimulatedMobileMoneyProvider.name);
  private readonly memory = new Map<string, SimulatedTransaction>();

  constructor(private readonly config: AppConfigService) {}

  async initiate(input: InitiatePaymentInput): Promise<InitiateResult> {
    const suffix = input.payerMsisdn.slice(-2);
    this.memory.set(input.externalReference, {
      amount: input.amount,
      currency: input.currency,
      suffix,
    });

    if (suffix === '06') {
      // Race délibérée : le webhook part et est TRAITÉ avant que cette
      // méthode ne rende la main à l'appelant.
      await this.dispatchWebhook(input.externalReference, 'SUCCEEDED');
    } else if (suffix !== '03') {
      // '03' : aucune réponse — le rattrapage puis l'expiration en portent la preuve.
      const times = suffix === '05' ? 2 : 1;
      for (let i = 0; i < times; i += 1) {
        setTimeout(() => {
          this.dispatchWebhook(input.externalReference, 'SUCCEEDED').catch((error: unknown) =>
            this.logger.warn(`Webhook simulé non délivré : ${String(error)}`),
          );
        }, this.config.get('MOMO_SIMULATOR_DELAY_MS'));
      }
    }

    return { providerReference: input.externalReference, state: 'PENDING', rawPayload: { suffix } };
  }

  async getStatus(providerReference: string): Promise<ProviderStatus> {
    const tx = this.memory.get(providerReference);
    if (!tx) {
      return { state: 'UNKNOWN', providerReference, rawPayload: null };
    }
    const base = {
      providerReference,
      operatorReference: `OPX${providerReference.slice(-8)}`,
      currency: tx.currency,
      rawPayload: { suffix: tx.suffix },
    };
    switch (tx.suffix) {
      case '02':
        return { ...base, state: 'FAILED', failureCode: 'INSUFFICIENT_FUNDS' };
      case '03':
        return { ...base, state: 'PENDING' };
      case '04':
        // Succès annoncé, mais montant divergent : déclenche MOMO.STATUS_MISMATCH.
        return { ...base, state: 'SUCCEEDED', amount: tx.amount - 1n, feeAmount: 0n };
      default:
        return { ...base, state: 'SUCCEEDED', amount: tx.amount, feeAmount: 0n };
    }
  }

  parseWebhook(raw: RawWebhook): ParsedWebhook {
    const body = raw.body as {
      eventId?: string;
      merchantReference: string;
      providerReference: string;
      status: 'SUCCEEDED' | 'FAILED';
      amount?: string;
      currency?: string;
    };
    return {
      eventId: body.eventId,
      merchantReference: body.merchantReference,
      providerReference: body.providerReference,
      state: body.status,
      amount: body.amount ? BigInt(body.amount) : undefined,
      currency: body.currency,
    };
  }

  verifyWebhook(raw: RawWebhook): boolean {
    const header = raw.headers['x-simulator-signature'];
    const value = Array.isArray(header) ? header[0] : header;
    return verifyHmacSignature(raw.rawBody, value, this.config.get('MOMO_SIMULATOR_SECRET'));
  }

  private async dispatchWebhook(
    merchantReference: string,
    status: 'SUCCEEDED' | 'FAILED',
  ): Promise<void> {
    const payload = {
      eventId: `${merchantReference}:${status}`,
      merchantReference,
      providerReference: merchantReference,
      status,
      amount: this.memory.get(merchantReference)?.amount.toString(),
      currency: this.memory.get(merchantReference)?.currency,
    };
    const body = JSON.stringify(payload);
    const signature = signHmac(body, this.config.get('MOMO_SIMULATOR_SECRET'));
    const url = `${this.config.get('MOMO_WEBHOOK_BASE_URL')}/${this.config.get('API_GLOBAL_PREFIX')}/webhooks/mobile-money/simulator`;
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-simulator-signature': signature },
        body,
      });
    } catch (error) {
      this.logger.warn(`Webhook simulé : échec d'appel vers ${url} : ${String(error)}`);
    }
  }
}
