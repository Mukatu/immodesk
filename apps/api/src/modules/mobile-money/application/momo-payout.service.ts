import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import { readOperationalSettings } from '../../../shared/settings/operational-settings';
import { detectOperator } from '../domain/momo-rules';
import type {
  MobileMoneyPayoutInitiator,
  MobileMoneyPayoutInput,
  MobileMoneyPayoutResult,
} from '../domain/ports';
import type { InitiateResult, MobileMoneyProvider, ProviderStatus } from '../domain/ports';
import { MobileMoneyProviderRegistry } from '../infrastructure/mobile-money-provider.registry';

/**
 * Décaissement Mobile Money vers un bailleur (contrat phase 7, § Reversements) :
 * voir `domain/ports.ts` (MOMO_PAYOUT_INITIATOR) pour la décision de réemploi
 * de `MobileMoneyProvider.initiate()`, conçu pour la collecte.
 *
 * Prend le client TRANSACTIONNEL déjà ouvert par `owner-payouts`
 * (`OwnerPayoutsService.execute`) : jamais de `PrismaService.withTenant` ici,
 * qui ouvrirait une SECONDE transaction imbriquée et romprait l'atomicité
 * exigée par le contrat (le reversement et sa transaction Mobile Money
 * doivent apparaître ou disparaître ensemble). Le fournisseur agrégateur de
 * l'organisation est donc lu directement sur `organization_settings` via
 * `tx`, comme `readOperationalSettings` le permet, plutôt que par
 * `PaymentMethodsService.get()` (qui ouvrirait, lui, sa propre transaction).
 */
@Injectable()
export class MomoPayoutService implements MobileMoneyPayoutInitiator {
  constructor(private readonly registry: MobileMoneyProviderRegistry) {}

  async initiatePayout(
    tx: TenantClient,
    input: MobileMoneyPayoutInput,
  ): Promise<MobileMoneyPayoutResult> {
    const operator = detectOperator(input.payerMsisdn);
    if (!operator) {
      throw new DomainError('MOMO.OPERATOR_UNKNOWN', { payerMsisdn: input.payerMsisdn });
    }

    const settingsRow = await tx.organization_settings.findUnique({
      where: { organization_id: input.organizationId },
    });
    const providerCode = settingsRow
      ? readOperationalSettings(settingsRow.settings_json).paymentMethods.mobileMoneyAggregator
          .provider
      : 'SIMULATOR';
    const provider = this.registry.forCode(providerCode);

    const id = newId();
    await tx.mobile_money_transactions.create({
      data: {
        id,
        organization_id: input.organizationId,
        provider: operator === 'MTN' ? 'MTN_MOMO' : 'AIRTEL_MONEY',
        aggregator: provider.code,
        direction: 'OUTBOUND',
        channel: 'AGGREGATOR',
        status: 'INITIATED',
        merchant_reference: input.externalReference,
        // Bénéficiaire du reversement, pas un payeur (voir domain/ports.ts).
        payer_msisdn: input.payerMsisdn,
        amount: input.amount,
        currency: input.currency,
      },
    });

    const initiated = await provider.initiate({
      amount: input.amount,
      currency: input.currency,
      payerMsisdn: input.payerMsisdn,
      operator,
      externalReference: input.externalReference,
      description: input.description,
      callbackUrl: '',
    });

    // Le simulateur (et un agrégateur réel interrogé sans délai) peut avoir
    // déjà résolu la transaction : re-interroger tout de suite évite
    // d'attendre inutilement un webhook qui, pour un décaissement, n'a pas
    // de route dédiée (voir la limitation documentée dans domain/ports.ts).
    const resolved =
      initiated.state === 'PENDING'
        ? await this.safeGetStatus(provider, initiated.providerReference)
        : initiated;

    await this.persistResult(tx, id, initiated, resolved);
    return {
      momoTransactionId: id,
      providerReference: initiated.providerReference,
      state: toPortState(resolved.state),
    };
  }

  async refreshPayoutStatus(
    tx: TenantClient,
    momoTransactionId: string,
  ): Promise<MobileMoneyPayoutResult> {
    const row = await tx.mobile_money_transactions.findFirst({
      where: { id: momoTransactionId },
      select: { aggregator: true, aggregator_transaction_id: true, merchant_reference: true },
    });
    if (!row) {
      throw new DomainError('PLATFORM.NOT_FOUND', {
        resource: 'mobile_money_transactions',
        id: momoTransactionId,
      });
    }
    const provider = this.registry.forCode(row.aggregator ?? 'SIMULATOR');
    const providerReference = row.aggregator_transaction_id ?? row.merchant_reference;
    const status = await provider.getStatus(providerReference);

    await tx.mobile_money_transactions.update({
      where: { id: momoTransactionId },
      data: {
        status: toMomoDbStatus(status.state),
        status_checked_at: new Date(),
        status_check_count: { increment: 1 },
        completed_at: status.state === 'SUCCEEDED' || status.state === 'FAILED' ? new Date() : null,
        raw_payload: (status.rawPayload ?? {}) as object,
        failure_code: status.failureCode ?? null,
        failure_message: status.failureMessage ?? null,
      },
    });

    return {
      momoTransactionId,
      providerReference,
      state: toPortState(status.state),
    };
  }

  /** `getStatus` ne doit jamais faire échouer l'initiation elle-même : PROCESSING reste correct. */
  private async safeGetStatus(
    provider: MobileMoneyProvider,
    providerReference: string,
  ): Promise<InitiateResult | ProviderStatus> {
    try {
      return await provider.getStatus(providerReference);
    } catch {
      return { providerReference, state: 'PENDING', rawPayload: null };
    }
  }

  private async persistResult(
    tx: TenantClient,
    id: string,
    initiated: InitiateResult,
    resolved: InitiateResult | ProviderStatus,
  ): Promise<void> {
    await tx.mobile_money_transactions.update({
      where: { id },
      data: {
        status: toMomoDbStatus(resolved.state),
        aggregator_transaction_id: initiated.providerReference,
        raw_payload: (resolved.rawPayload ?? initiated.rawPayload ?? {}) as object,
        completed_at:
          resolved.state === 'SUCCEEDED' || resolved.state === 'FAILED' ? new Date() : null,
      },
    });
  }
}

function toPortState(
  state: ProviderStatus['state'] | InitiateResult['state'],
): 'PENDING' | 'SUCCEEDED' | 'FAILED' {
  if (state === 'SUCCEEDED') return 'SUCCEEDED';
  if (state === 'FAILED') return 'FAILED';
  return 'PENDING';
}

function toMomoDbStatus(
  state: ProviderStatus['state'] | InitiateResult['state'],
): 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED' {
  if (state === 'EXPIRED') return 'EXPIRED';
  if (state === 'SUCCEEDED') return 'SUCCEEDED';
  if (state === 'FAILED') return 'FAILED';
  return 'PENDING';
}
