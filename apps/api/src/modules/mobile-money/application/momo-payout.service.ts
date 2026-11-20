import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { readOperationalSettings } from '../../../shared/settings/operational-settings';
import {
  assertMomoTransition,
  detectOperator,
  providerConfirmsAmount,
  providerReferenceOf,
  type MomoStatus,
} from '../domain/momo-rules';
import { MomoStatusChecker } from './momo-status-checker';
import type {
  MobileMoneyPayoutInitiator,
  MobileMoneyPayoutInput,
  MobileMoneyPayoutOutcome,
  MobileMoneyPayoutOutcomeListener,
  MobileMoneyPayoutOutcomeRegistry,
  MobileMoneyPayoutResult,
} from '../domain/ports';
import type {
  InitiateResult,
  MobileMoneyProvider,
  ProviderStatus,
  ProviderStatusExpectation,
} from '../domain/ports';
import { buildMomoNotifyUrl } from '../infrastructure/momo-notify-url';
import { MobileMoneyProviderRegistry } from '../infrastructure/mobile-money-provider.registry';
import { MomoVerifyQueue } from '../infrastructure/momo-verify.queue';

type PortState = 'PENDING' | 'SUCCEEDED' | 'FAILED';
const IN_FLIGHT: readonly string[] = ['INITIATED', 'PENDING'];

/** Ligne lue pour un décaissement (colonnes utiles seulement). */
interface PayoutRow {
  id: string;
  organization_id: string;
  status: MomoStatus;
  purpose: string;
  direction: string;
  aggregator: string | null;
  aggregator_transaction_id: string | null;
  external_reference: string | null;
  payer_msisdn: string;
  amount: bigint;
  currency: string;
  payout_execute_sent_at: Date | null;
}

/**
 * Décaissement Mobile Money vers un bailleur (contrat phase 7, § Reversements) :
 * voir `domain/ports.ts` (MOMO_PAYOUT_INITIATOR) pour la décision de réemploi
 * de `MobileMoneyProvider.initiate()`, conçu pour la collecte.
 *
 * `initiatePayout` prend le client TRANSACTIONNEL déjà ouvert par `owner-payouts`
 * (`OwnerPayoutsService.execute`) : jamais de `PrismaService.withTenant` ici,
 * qui ouvrirait une SECONDE transaction imbriquée et romprait l'atomicité
 * exigée par le contrat (le reversement et sa transaction Mobile Money
 * doivent apparaître ou disparaître ensemble).
 *
 * L'ORDRE D'EXÉCUTION d'un retrait approuvé (virement réel, jamais rejouable) est
 * donné par `verifyPayout` (callback, rattrapage) HORS de toute transaction longue :
 * un marqueur `payout_execute_sent_at` est commité AVANT l'appel, et s'il existe
 * l'exécution n'est plus jamais relancée automatiquement. La route manuelle
 * (`refreshPayoutStatus`) ne fait que lire le statut.
 */
@Injectable()
export class MomoPayoutService
  implements MobileMoneyPayoutInitiator, MobileMoneyPayoutOutcomeRegistry
{
  private readonly logger = new Logger(MomoPayoutService.name);
  private readonly listeners: MobileMoneyPayoutOutcomeListener[] = [];

  constructor(
    private readonly registry: MobileMoneyProviderRegistry,
    private readonly config: AppConfigService,
    private readonly statusChecker: MomoStatusChecker,
    private readonly prisma: PrismaService,
    private readonly verifyQueue: MomoVerifyQueue,
  ) {}

  onPayoutOutcome(listener: MobileMoneyPayoutOutcomeListener): void {
    this.listeners.push(listener);
  }

  /** Répercute une issue (réussie, échouée, expirée) sur le reversement, dans la transaction de l'appelant. */
  async notifyOutcome(tx: TenantClient, outcome: MobileMoneyPayoutOutcome): Promise<void> {
    for (const listener of this.listeners) await listener(tx, outcome);
  }

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
    // `REV-AAAAMM-NNNNN` est numérotée par organisation : la clé transmise au
    // fournisseur est propre à la transaction (OpenPay impose un UUID v4, distinct de l'id v7).
    const externalReference = provider.newPayoutReference?.() ?? id;
    await tx.mobile_money_transactions.create({
      data: {
        id,
        organization_id: input.organizationId,
        provider: operator === 'MTN' ? 'MTN_MOMO' : 'AIRTEL_MONEY',
        aggregator: provider.code,
        direction: 'OUTBOUND',
        purpose: 'OWNER_PAYOUT',
        channel: 'AGGREGATOR',
        status: 'INITIATED',
        merchant_reference: input.externalReference,
        external_reference: externalReference,
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
      externalReference,
      description: input.description,
      callbackUrl: buildMomoNotifyUrl(this.config, provider.code),
      kind: 'PAYOUT',
    });

    // Le simulateur (et un agrégateur réel interrogé sans délai) peut avoir
    // déjà résolu la transaction : re-interroger tout de suite évite
    // d'attendre inutilement un webhook (qui, lui, est routé par `purpose`
    // vers `verifyPayout`, voir `MomoPurposeRouter`).
    // Un SUCCEEDED d'initiation ne porte ni montant ni devise : il est
    // re-vérifié par getStatus, et seul un statut conforme vaut SUCCEEDED.
    const resolved: InitiateResult | ProviderStatus =
      initiated.state === 'FAILED'
        ? initiated
        : withVerifiedAmount(
            await this.safeGetStatus(provider, initiated.providerReference, {
              kind: 'PAYOUT',
              externalReference,
              amount: input.amount,
              currency: input.currency,
              msisdn: input.payerMsisdn,
            }),
            { amount: input.amount, currency: input.currency },
          );

    await this.persistResult(tx, id, initiated, resolved);
    return {
      momoTransactionId: id,
      providerReference: initiated.providerReference,
      state: toPortState(resolved.state),
    };
  }

  /**
   * Route manuelle (`POST /owner-payouts/{id}/execute` rejouée) : LECTURE du statut sous verrou
   * de ligne, dans la transaction de `owner-payouts`. Aucun ordre d'exécution n'est donné ici :
   * un retrait approuvé est confié à `verifyPayout` (file de vérification), qui seul pose le
   * marqueur et appelle le fournisseur hors transaction. L'état n'évolue que par une transition
   * valide : une réponse inconnue ou non conforme ne change rien.
   */
  async refreshPayoutStatus(
    tx: TenantClient,
    momoTransactionId: string,
  ): Promise<MobileMoneyPayoutResult> {
    await tx.$queryRawUnsafe(
      `SELECT id FROM mobile_money_transactions WHERE id = $1::uuid FOR UPDATE`,
      momoTransactionId,
    );
    const row = (await tx.mobile_money_transactions.findFirst({
      where: { id: momoTransactionId },
    })) as PayoutRow | null;
    if (!row) {
      throw new DomainError('PLATFORM.NOT_FOUND', {
        resource: 'mobile_money_transactions',
        id: momoTransactionId,
      });
    }
    const provider = this.registry.forCode(row.aggregator ?? 'SIMULATOR');
    const providerReference = providerReferenceOf(row);
    if (!providerReference) {
      throw new DomainError('MOMO.PROVIDER_UNAVAILABLE', {
        reason: 'external_reference absente : référence fournisseur introuvable',
        momoTransactionId,
      });
    }
    const result = (state: PortState): MobileMoneyPayoutResult => ({
      momoTransactionId,
      providerReference,
      state,
    });
    if (!IN_FLIGHT.includes(row.status)) return result(portStateOfRow(row.status));
    const checked = await this.statusChecker.check(null, provider, row, 'PAYOUT');
    if (!checked) return result('PENDING');
    const status = withVerifiedAmount(checked, row);
    if (isExecutable(provider, row, status)) {
      this.enqueueVerifyBestEffort(row);
      return result('PENDING');
    }
    await tx.mobile_money_transactions.update({
      where: { id: momoTransactionId },
      data: { status_checked_at: new Date(), status_check_count: { increment: 1 } },
    });
    return result(await this.applyStatus(tx, row, status, false));
  }

  /**
   * Vérification d'un décaissement hors de toute transaction longue (callback, rattrapage) :
   * lecture, appel(s) au fournisseur, puis écriture dans des transactions COURTES. Un retrait
   * approuvé est exécuté au plus une fois : le marqueur `payout_execute_sent_at` est posé
   * (UPDATE atomique, commité) AVANT l'appel ; s'il existe déjà, l'exécution n'est jamais
   * relancée automatiquement (alerte pour décision humaine).
   */
  async verifyPayout(organizationId: string, transactionId: string): Promise<void> {
    const row = (await this.prisma.withTenant(organizationId, null, (tx) =>
      tx.mobile_money_transactions.findFirst({
        where: { id: transactionId, purpose: 'OWNER_PAYOUT', channel: 'AGGREGATOR' },
      }),
    )) as PayoutRow | null;
    if (!row || !IN_FLIGHT.includes(row.status)) return;
    const provider = this.registry.forCode(row.aggregator ?? 'SIMULATOR');
    if (!providerReferenceOf(row)) {
      this.logger.warn(
        `MOMO.VERIFY_SKIPPED transaction=${row.id} : référence fournisseur inconnue`,
      );
      return;
    }
    const checked = await this.statusChecker.check(null, provider, row, 'PAYOUT');
    if (!checked) return;
    let status = withVerifiedAmount(checked, row);
    if (isExecutable(provider, row, status) && provider.executePayout) {
      const proceed = await this.claimExecution(organizationId, row);
      if (!proceed) return;
      try {
        status = withVerifiedAmount(
          await provider.executePayout(providerReferenceOf(row) as string, expectationOf(row)),
          row,
        );
      } catch (error) {
        // Issue incertaine (délai, réseau) : le virement a peut-être été émis. Le marqueur reste
        // posé, aucune relance automatique ; le statut sera relu (`completed` ou non) ensuite.
        this.logger.error(
          `MOMO.PAYOUT_EXECUTE_UNKNOWN transaction=${row.id} : issue incertaine (${(error as Error).message}), exécution jamais relancée automatiquement : vérifier chez le fournisseur.`,
        );
        return;
      }
    }
    await this.prisma.withTenant(organizationId, null, async (tx) => {
      await tx.$queryRawUnsafe(
        `SELECT id FROM mobile_money_transactions WHERE id = $1::uuid FOR UPDATE`,
        transactionId,
      );
      const locked = (await tx.mobile_money_transactions.findFirst({
        where: { id: transactionId },
      })) as PayoutRow | null;
      if (locked) await this.applyStatus(tx, locked, status, true);
    });
  }

  /** `false` : l'ordre a déjà été donné (ou la ligne n'est plus en cours) : ne pas l'émettre. */
  private async claimExecution(organizationId: string, row: PayoutRow): Promise<boolean> {
    const claimed = await this.prisma.withTenant(organizationId, null, (tx) =>
      tx.$executeRawUnsafe(
        `UPDATE mobile_money_transactions SET payout_execute_sent_at = now()
          WHERE id = $1::uuid AND payout_execute_sent_at IS NULL
            AND purpose = 'OWNER_PAYOUT' AND status IN ('INITIATED', 'PENDING')`,
        row.id,
      ),
    );
    if (claimed === 1) return true;
    this.logger.error(
      `MOMO.PAYOUT_EXECUTE_ALREADY_SENT transaction=${row.id} : retrait approuvé mais ordre d'exécution déjà envoyé (${row.payout_execute_sent_at?.toISOString() ?? 'par un autre traitement'}), jamais relancé automatiquement : décision humaine requise.`,
    );
    return false;
  }

  private enqueueVerifyBestEffort(row: PayoutRow): void {
    void this.verifyQueue
      .enqueue({ organizationId: row.organization_id, transactionId: row.id })
      .catch((error: unknown) =>
        this.logger.warn(
          `MOMO.PAYOUT_VERIFY_NOT_ENQUEUED transaction=${row.id} : ${String(error)}`,
        ),
      );
  }

  /**
   * Applique l'état du fournisseur par une transition CONTRÔLÉE : une ligne déjà terminale ne
   * bouge plus, `UNKNOWN` ne change rien, `PENDING` ne fait avancer que `INITIATED`.
   */
  private async applyStatus(
    tx: TenantClient,
    row: PayoutRow,
    status: ProviderStatus,
    notify: boolean,
  ): Promise<PortState> {
    if (!IN_FLIGHT.includes(row.status)) return portStateOfRow(row.status);
    const next = nextMomoStatus(row.status, status.state);
    if (!next) return 'PENDING';
    assertMomoTransition(row.status, next);
    const terminal = next === 'SUCCEEDED' || next === 'FAILED' || next === 'EXPIRED';
    await tx.mobile_money_transactions.update({
      where: { id: row.id },
      data: {
        status: next,
        completed_at: terminal ? new Date() : null,
        raw_payload: (status.rawPayload ?? {}) as object,
        failure_code: status.failureCode ?? null,
        failure_message: status.failureMessage ?? null,
      },
    });
    if (terminal && notify) {
      await this.notifyOutcome(tx, {
        organizationId: row.organization_id,
        momoTransactionId: row.id,
        state: next,
      });
    }
    return portStateOfRow(next);
  }

  /** `getStatus` ne doit jamais faire échouer l'initiation elle-même : PROCESSING reste correct. */
  private async safeGetStatus(
    provider: MobileMoneyProvider,
    providerReference: string,
    expected: ProviderStatusExpectation,
  ): Promise<ProviderStatus> {
    try {
      return await provider.getStatus(providerReference, expected);
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

/** Ce qui est attendu d'un décaissement, lu en base (jamais dans la réponse du fournisseur). */
function expectationOf(row: PayoutRow): ProviderStatusExpectation {
  return {
    kind: 'PAYOUT',
    externalReference: row.external_reference as string,
    amount: row.amount,
    currency: row.currency,
    msisdn: row.payer_msisdn,
  };
}

/**
 * Retrait approuvé : l'ordre d'exécution n'est donné que pour une transaction OWNER_PAYOUT
 * sortante, encore en cours, dont le montant, le bénéficiaire et la référence ont été confirmés
 * à l'instant (`matched`) par le fournisseur.
 */
function isExecutable(provider: MobileMoneyProvider, row: PayoutRow, status: ProviderStatus) {
  return (
    status.nextAction === 'EXECUTE' &&
    status.matched === true &&
    typeof provider.executePayout === 'function' &&
    row.purpose === 'OWNER_PAYOUT' &&
    row.direction === 'OUTBOUND' &&
    IN_FLIGHT.includes(row.status)
  );
}

/** Statut à écrire, ou `null` (aucun changement) : `UNKNOWN` n'écrit rien, `PENDING` ne fait avancer que `INITIATED`. */
function nextMomoStatus(
  current: MomoStatus,
  state: ProviderStatus['state'],
): 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED' | null {
  if (state === 'UNKNOWN') return null;
  if (state === 'PENDING') return current === 'INITIATED' ? 'PENDING' : null;
  return state;
}

function portStateOfRow(status: string): PortState {
  if (status === 'SUCCEEDED') return 'SUCCEEDED';
  return IN_FLIGHT.includes(status) ? 'PENDING' : 'FAILED';
}

/**
 * Un SUCCEEDED fournisseur sans montant ET devise égaux à la transaction
 * n'est pas une confirmation : le décaissement reste PENDING.
 */
function withVerifiedAmount(
  status: ProviderStatus,
  expected: { amount: bigint; currency: string },
): ProviderStatus {
  if (status.state !== 'SUCCEEDED' || providerConfirmsAmount(status, expected)) return status;
  new Logger(MomoPayoutService.name).warn(
    `MOMO.STATUS_MISMATCH décaissement ${status.providerReference} attendu=${expected.amount} ${expected.currency} recu=${status.amount ?? 'absent'} ${status.currency ?? 'devise absente'}`,
  );
  return { ...status, state: 'PENDING' };
}

function toPortState(state: ProviderStatus['state'] | InitiateResult['state']): PortState {
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
