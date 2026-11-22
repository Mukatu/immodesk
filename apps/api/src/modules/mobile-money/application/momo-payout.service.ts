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
  MobileMoneyPayoutResolution,
  MobileMoneyPayoutResult,
} from '../domain/ports';
import { PAYOUT_EXECUTE_RETRY_MINUTES } from '../domain/reconcile-rules';
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
  payout_execute_refused_at: Date | null;
  payout_alert_code: string | null;
}

/** Un ordre d'exécution posé depuis moins de ce délai est peut-être encore en cours (course normale). */
const EXECUTE_IN_PROGRESS_MS = 40_000;

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
        // Après un échec terminal, une nouvelle tentative porte un suffixe : `momo_merchant_ref_uk`
        // (organisation, merchant_reference) interdit deux transactions de même référence.
        merchant_reference:
          input.attempt && input.attempt > 1
            ? `${input.externalReference}-${input.attempt}`
            : input.externalReference,
        external_reference: externalReference,
        // Bénéficiaire du reversement, pas un payeur (voir domain/ports.ts).
        payer_msisdn: input.payerMsisdn,
        amount: input.amount,
        currency: input.currency,
      },
    });

    let initiated: InitiateResult;
    try {
      initiated = await provider.initiate({
        amount: input.amount,
        currency: input.currency,
        payerMsisdn: input.payerMsisdn,
        operator,
        externalReference,
        description: input.description,
        callbackUrl: buildMomoNotifyUrl(this.config, provider.code),
        kind: 'PAYOUT',
      });
    } catch (error) {
      // Délai dépassé : la demande a pu être créée chez le fournisseur alors que cette transaction
      // (donc sa référence) va disparaître : annulation au mieux sous la référence générée ici.
      await this.discardOrphanPayout({
        momoTransactionId: id,
        providerReference: externalReference,
        state: 'PENDING',
        aggregator: provider.code,
      });
      throw error;
    }
    const created: MobileMoneyPayoutResult = {
      momoTransactionId: id,
      providerReference: initiated.providerReference,
      state: 'PENDING',
      aggregator: provider.code,
    };
    try {
      return await this.settleInitiation(tx, provider, input, id, externalReference, initiated);
    } catch (error) {
      // La transaction de l'appelant va être annulée alors que le retrait existe chez le
      // fournisseur : annulation au mieux, pour ne pas laisser un retrait orphelin.
      if (initiated.state !== 'FAILED') await this.discardOrphanPayout(created);
      throw error;
    }
  }

  private async settleInitiation(
    tx: TenantClient,
    provider: MobileMoneyProvider,
    input: MobileMoneyPayoutInput,
    id: string,
    externalReference: string,
    initiated: InitiateResult,
  ): Promise<MobileMoneyPayoutResult> {
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
      aggregator: provider.code,
    };
  }

  /** Annulation au mieux (DELETE) d'un retrait orphelin : jamais d'exception, toujours journalisé. */
  async discardOrphanPayout(result: MobileMoneyPayoutResult): Promise<void> {
    try {
      const provider = this.registry.forCode(result.aggregator ?? 'SIMULATOR');
      if (!provider.cancelPayout) return;
      const outcome = await provider.cancelPayout(result.providerReference);
      this.logger.warn(
        `MOMO.PAYOUT_ORPHAN_DISCARDED transaction=${result.momoTransactionId} reference=${result.providerReference} : annulation chez le fournisseur ${outcome}.`,
      );
    } catch (error) {
      this.logger.error(
        `MOMO.PAYOUT_ORPHAN transaction=${result.momoTransactionId} reference=${result.providerReference} : annulation impossible (${(error as Error).message}), retrait possiblement orphelin chez le fournisseur : vérifier.`,
      );
    }
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
        const executed = await provider.executePayout(
          providerReferenceOf(row) as string,
          expectationOf(row),
        );
        if (executed.executeRefused) {
          await this.handleExecuteRefused(organizationId, row, provider);
          return;
        }
        status = withVerifiedAmount(executed, row);
      } catch (error) {
        // Issue incertaine (délai, réseau, 5xx) : le virement a peut-être été émis. Le marqueur
        // reste posé, aucune relance automatique ; le statut sera relu (`completed` ou non).
        await this.alertOnce(
          organizationId,
          row.id,
          'BLOCKED',
          'MOMO.PAYOUT_EXECUTE_UNKNOWN',
          `issue incertaine (${(error as Error).message}), exécution jamais relancée automatiquement : vérifier chez le fournisseur puis résoudre (action d'administration du reversement).`,
        );
        return;
      }
    }
    await this.applyLocked(organizationId, transactionId, status);
  }

  /** Applique un statut du fournisseur sous verrou de ligne, dans une transaction courte. */
  private async applyLocked(
    organizationId: string,
    transactionId: string,
    status: ProviderStatus,
  ): Promise<void> {
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

  /**
   * Ordre d'exécution REFUSÉ (HTTP 400/404 : solde insuffisant, retrait non approuvé) : aucun
   * virement n'est parti. Le statut est relu avant toute conclusion : un retrait encore
   * `approved` lève le marqueur (relance espacée de `PAYOUT_EXECUTE_RETRY_MINUTES`, une seule
   * alerte) ; un autre statut conforme est appliqué ; une relecture impossible ou non conforme
   * laisse le marqueur (issue incertaine).
   */
  private async handleExecuteRefused(
    organizationId: string,
    row: PayoutRow,
    provider: MobileMoneyProvider,
  ): Promise<void> {
    let reread: ProviderStatus;
    try {
      reread = withVerifiedAmount(
        await provider.getStatus(providerReferenceOf(row) as string, {
          ...expectationOf(row),
          origin: 'RECONCILE',
        }),
        row,
      );
    } catch (error) {
      await this.alertOnce(
        organizationId,
        row.id,
        'BLOCKED',
        'MOMO.PAYOUT_EXECUTE_UNKNOWN',
        `ordre refusé mais statut illisible ensuite (${(error as Error).message}) : marqueur conservé, vérifier chez le fournisseur.`,
      );
      return;
    }
    if (isExecutable(provider, row, reread)) {
      await this.prisma.withTenant(organizationId, null, (tx) =>
        tx.$executeRawUnsafe(
          `UPDATE mobile_money_transactions
              SET payout_execute_sent_at = NULL, payout_execute_refused_at = now()
            WHERE id = $1::uuid AND status IN ('INITIATED', 'PENDING')`,
          row.id,
        ),
      );
      await this.alertOnce(
        organizationId,
        row.id,
        'REFUSED',
        'MOMO.PAYOUT_EXECUTE_REFUSED',
        `ordre d'exécution refusé par le fournisseur (solde plateforme ou opérateur insuffisant ?), retrait toujours approuvé, aucun virement émis : marqueur levé, nouvelle tentative dans ${PAYOUT_EXECUTE_RETRY_MINUTES} min. Alimenter le solde.`,
      );
      return;
    }
    if (reread.state === 'SUCCEEDED' || reread.state === 'FAILED' || reread.state === 'EXPIRED') {
      await this.applyLocked(organizationId, row.id, reread);
      return;
    }
    await this.alertOnce(
      organizationId,
      row.id,
      'BLOCKED',
      'MOMO.PAYOUT_EXECUTE_UNKNOWN',
      `ordre refusé, statut relu non concluant (${reread.state}) : marqueur conservé, vérifier chez le fournisseur.`,
    );
  }

  /**
   * `false` : l'ordre n'est pas à émettre maintenant (déjà donné, relance espacée, ligne conclue).
   * Un ordre posé depuis moins de ~40 s est une course normale (autre traitement en cours) :
   * simple avertissement. Au-delà, UNE alerte par transaction.
   */
  private async claimExecution(organizationId: string, row: PayoutRow): Promise<boolean> {
    const claimed = await this.prisma.withTenant(organizationId, null, (tx) =>
      tx.$executeRawUnsafe(
        `UPDATE mobile_money_transactions SET payout_execute_sent_at = now()
          WHERE id = $1::uuid AND payout_execute_sent_at IS NULL
            AND (payout_execute_refused_at IS NULL
                 OR payout_execute_refused_at <= now() - make_interval(mins => $2::int))
            AND purpose = 'OWNER_PAYOUT' AND status IN ('INITIATED', 'PENDING')`,
        row.id,
        PAYOUT_EXECUTE_RETRY_MINUTES,
      ),
    );
    if (claimed === 1) return true;
    const current = (await this.prisma.withTenant(organizationId, null, (tx) =>
      tx.mobile_money_transactions.findFirst({ where: { id: row.id } }),
    )) as PayoutRow | null;
    if (!current || !IN_FLIGHT.includes(current.status)) return false;
    const sentAt = current.payout_execute_sent_at;
    if (!sentAt) {
      // Refus récent : relance espacée, rien à signaler de plus.
      this.logger.debug(
        `MOMO.PAYOUT_EXECUTE_RETRY_LATER transaction=${row.id} : dernier refus ${current.payout_execute_refused_at?.toISOString() ?? '-'}`,
      );
      return false;
    }
    if (Date.now() - sentAt.getTime() < EXECUTE_IN_PROGRESS_MS) {
      this.logger.warn(
        `MOMO.PAYOUT_EXECUTE_IN_PROGRESS transaction=${row.id} : ordre posé à ${sentAt.toISOString()}, autre traitement en cours.`,
      );
      return false;
    }
    await this.alertOnce(
      organizationId,
      row.id,
      'BLOCKED',
      'MOMO.PAYOUT_EXECUTE_ALREADY_SENT',
      `retrait approuvé mais ordre d'exécution déjà envoyé (${sentAt.toISOString()}), jamais relancé automatiquement : vérifier chez le fournisseur puis résoudre (action d'administration du reversement).`,
    );
    return false;
  }

  /**
   * Alerte d'exploitation UNE FOIS par nature d'incident et par transaction (`payout_alert_code` :
   * `REFUSED` = ordre refusé, à relancer après alimentation du solde ; `BLOCKED` = issue incertaine,
   * décision humaine) : le rattrapage revient sur la ligne toutes les quelques minutes, l'alerte
   * ne doit pas se répéter. Lever le blocage (action d'administration) réarme l'alerte.
   */
  async alertOnce(
    organizationId: string,
    transactionId: string,
    kind: 'REFUSED' | 'BLOCKED',
    code: string,
    detail: string,
  ): Promise<void> {
    let first = true;
    try {
      const updated = await this.prisma.withTenant(organizationId, null, (tx) =>
        tx.$executeRawUnsafe(
          `UPDATE mobile_money_transactions SET payout_alert_code = $2
            WHERE id = $1::uuid AND payout_alert_code IS DISTINCT FROM $2`,
          transactionId,
          kind,
        ),
      );
      first = updated === 1;
    } catch {
      // Marqueur d'alerte illisible : mieux vaut une alerte en trop qu'aucune.
    }
    const message = `${code} transaction=${transactionId} : ${detail}`;
    if (first) this.logger.error(message);
    else this.logger.debug(`${message} (déjà signalé)`);
  }

  /**
   * Action d'administration (`OWNER`, auditée par l'appelant) sur un décaissement dont l'issue
   * est incertaine, APRÈS vérification chez le fournisseur par un humain. Aucun virement n'est émis
   * ici. `RETRY` lève les marqueurs : l'ordre ne repartira que si le statut relu par la
   * vérification est `approved` (état certain) ; `MARK_PAID` / `MARK_FAILED` concluent la ligne.
   */
  async resolveBlockedPayout(
    tx: TenantClient,
    momoTransactionId: string,
    resolution: MobileMoneyPayoutResolution,
  ): Promise<{ previousStatus: string; status: string; markerCleared: boolean }> {
    await tx.$queryRawUnsafe(
      `SELECT id FROM mobile_money_transactions WHERE id = $1::uuid FOR UPDATE`,
      momoTransactionId,
    );
    const row = (await tx.mobile_money_transactions.findFirst({
      where: { id: momoTransactionId },
    })) as PayoutRow | null;
    if (!row || row.purpose !== 'OWNER_PAYOUT' || row.direction !== 'OUTBOUND') {
      throw new DomainError('MOMO.NOT_FOUND', { momoTransactionId });
    }
    if (!IN_FLIGHT.includes(row.status)) {
      throw new DomainError('MOMO.INVALID_TRANSITION', { from: row.status, to: resolution });
    }
    if (resolution === 'RETRY') {
      if (!row.payout_execute_sent_at && !row.payout_execute_refused_at) {
        throw new DomainError('MOMO.INVALID_TRANSITION', { from: row.status, to: 'RETRY' });
      }
      await tx.$executeRawUnsafe(
        `UPDATE mobile_money_transactions
            SET payout_execute_sent_at = NULL, payout_execute_refused_at = NULL,
                payout_alert_code = NULL
          WHERE id = $1::uuid`,
        momoTransactionId,
      );
      this.enqueueVerifyBestEffort(row, 'RECONCILE', 5_000);
      return { previousStatus: row.status, status: row.status, markerCleared: true };
    }
    const next = resolution === 'MARK_PAID' ? 'SUCCEEDED' : 'FAILED';
    assertMomoTransition(row.status, next);
    await tx.mobile_money_transactions.update({
      where: { id: row.id },
      data: {
        status: next,
        completed_at: new Date(),
        failure_code: next === 'FAILED' ? 'MANUAL_RESOLUTION' : null,
        failure_message: next === 'FAILED' ? 'Marqué échoué par un administrateur.' : null,
      },
    });
    await this.notifyOutcome(tx, {
      organizationId: row.organization_id,
      momoTransactionId: row.id,
      state: next,
      source: 'MANUAL_RESOLUTION',
    });
    return { previousStatus: row.status, status: next, markerCleared: false };
  }

  private enqueueVerifyBestEffort(
    row: PayoutRow,
    origin: 'REFRESH' | 'RECONCILE' = 'REFRESH',
    delay?: number,
  ): void {
    void this.verifyQueue
      .enqueue(
        { organizationId: row.organization_id, transactionId: row.id, origin },
        delay ? { delay } : undefined,
      )
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
