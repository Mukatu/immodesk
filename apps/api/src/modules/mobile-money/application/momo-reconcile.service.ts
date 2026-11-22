import { Injectable, Logger } from '@nestjs/common';
import type { PrismaClient } from '../../../generated/prisma/client';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { readOperationalSettings } from '../../../shared/settings/operational-settings';
import {
  INITIATED_MIN_AGE_MINUTES,
  INITIATION_REPLAY_MAX_AGE_MINUTES,
  INITIATION_REPLAY_MIN_AGE_MINUTES,
  OWNER_PAYOUT_EXPIRY_MINUTES,
  PENDING_MIN_AGE_MINUTES,
  isDueForRecheck,
  isExpired,
  isInitiatedExpired,
  isInitiationReplayable,
} from '../domain/reconcile-rules';
import { assertMomoTransition, detectOperator, type MomoStatus } from '../domain/momo-rules';
import type { MomoPurpose } from '../domain/momo-purpose';
import { MobileMoneyProviderRegistry } from '../infrastructure/mobile-money-provider.registry';
import { buildMomoNotifyUrl } from '../infrastructure/momo-notify-url';
import { MomoPayoutService } from './momo-payout.service';
import { MomoPurposeRouter } from './momo-purpose-router';

interface PendingRow {
  id: string;
  organization_id: string;
  status: 'INITIATED' | 'PENDING';
  initiated_at: Date;
  status_checked_at: Date | null;
  status_check_count: number;
  external_reference: string | null;
  purpose: MomoPurpose;
  aggregator: string | null;
  aggregator_transaction_id: string | null;
  payer_msisdn: string;
  amount: bigint;
  tenant_id: string | null;
  invoice_id: string | null;
  failure_code: string | null;
}

/**
 * Rattrapage des transactions Mobile Money agrégateur restées `PENDING` ou `INITIATED`
 * (job `momo:reconcile-pending`, contrat phase 4, § « Rattrapage »). Lecture
 * transverse aux organisations par le rôle d'administration — même
 * mécanique que `WebhooksService` (notifications) pour les webhooks entrants,
 * puisqu'un cron n'a pas de tenant courant.
 */
@Injectable()
export class MomoReconcileService {
  private readonly logger = new Logger(MomoReconcileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly router: MomoPurposeRouter,
    private readonly auditService: AuditService,
    private readonly config: AppConfigService,
    private readonly registry: MobileMoneyProviderRegistry,
    private readonly payouts: MomoPayoutService,
  ) {}

  async reconcilePending(now: Date = new Date()): Promise<{ rechecked: number; expired: number }> {
    const admin = this.adminClient();
    const rows = await admin.$queryRawUnsafe<PendingRow[]>(
      `SELECT id, organization_id, status, initiated_at, status_checked_at, status_check_count, external_reference, purpose,
              aggregator, aggregator_transaction_id, payer_msisdn, amount,
              tenant_id, invoice_id, failure_code
         FROM mobile_money_transactions
        WHERE channel = 'AGGREGATOR'
          AND ((status = 'PENDING' AND initiated_at <= now() - make_interval(mins => $1::int))
            OR (status = 'INITIATED' AND initiated_at <= now() - make_interval(mins => $2::int)))`,
      PENDING_MIN_AGE_MINUTES,
      // Les INITIATED sont lues dès l'âge de rejeu d'une initiation (voir `recoverInitiation`) ;
      // celles qui n'en relèvent pas attendent `INITIATED_MIN_AGE_MINUTES` plus bas.
      INITIATION_REPLAY_MIN_AGE_MINUTES,
    );
    let rechecked = 0;
    let expired = 0;
    for (const row of rows) {
      const settings = await admin.organization_settings.findUnique({
        where: { organization_id: row.organization_id },
        select: { settings_json: true },
      });
      const pendingExpiryMinutes = readOperationalSettings(settings?.settings_json).paymentMethods
        .pendingExpiryMinutes;

      // Un reversement attend l'approbation du fournisseur (OpenPay : >= 25 h) : il n'expire pas
      // avec les collectes, et un retrait n'est expiré qu'après annulation chez le fournisseur.
      const payout = row.purpose === 'OWNER_PAYOUT';
      if (
        row.status === 'PENDING' &&
        isExpired(
          row.initiated_at,
          now,
          payout ? OWNER_PAYOUT_EXPIRY_MINUTES : pendingExpiryMinutes,
        )
      ) {
        if (payout) {
          if (await this.expirePayout(row)) expired += 1;
        } else {
          // Dernière vérification AVANT d'expirer : un callback perdu ne doit pas faire expirer un
          // paiement réussi (`expire` ne touche plus une ligne que la vérification a conclue).
          await this.safeVerify(row);
          if (await this.expire(row.organization_id, row.id)) expired += 1;
        }
        continue;
      }
      // INITIATED OpenPay sans référence (réponse d'initiation perdue) : rejeu idempotent, mais
      // seulement dans une courte fenêtre et après un délai dépassé (voir `recoverInitiation`).
      if (row.status === 'INITIATED' && (await this.recoverInitiation(row, now))) {
        rechecked += 1;
        continue;
      }
      if (
        row.status === 'INITIATED' &&
        now.getTime() - row.initiated_at.getTime() < INITIATED_MIN_AGE_MINUTES * 60_000
      ) {
        continue;
      }
      // INITIATED que le fournisseur ne fait jamais évoluer (réponse d'initiation
      // perdue, aucune référence) : dernière interrogation si possible, puis EXPIRED
      // après `MOMO_INITIATED_EXPIRY_MINUTES`. Le rattrapage couvre les trois purposes.
      if (
        row.status === 'INITIATED' &&
        isInitiatedExpired(row.initiated_at, now, this.config.get('MOMO_INITIATED_EXPIRY_MINUTES'))
      ) {
        await this.safeVerify(row);
        if (await this.expire(row.organization_id, row.id)) expired += 1;
        continue;
      }
      // Ligne AGGREGATOR antérieure à la migration 9 : sans `external_reference`,
      // aucune référence fournisseur sûre (voir `providerReferenceOf`). Elle ne
      // peut qu'expirer, jamais être re-interrogée.
      if (!row.external_reference) {
        this.logger.warn(
          `MOMO.RECONCILE_SKIPPED transaction=${row.id} : external_reference absente, fournisseur non interrogé`,
        );
        continue;
      }
      if (isDueForRecheck(row.status_checked_at, row.initiated_at, row.status_check_count, now)) {
        const handler = this.router.handlerFor(row.purpose);
        if (!handler) {
          this.logger.warn(
            `MOMO.RECONCILE_NO_HANDLER transaction=${row.id} purpose=${row.purpose} : aucun traitement inscrit`,
          );
          continue;
        }
        try {
          await handler.verifyNow(row.organization_id, row.id, { origin: 'RECONCILE' });
          rechecked += 1;
        } catch (error) {
          // Une interrogation en échec (fournisseur indisponible) ne doit pas
          // interrompre le rattrapage des autres transactions.
          this.logger.warn(
            `MOMO.RECONCILE_VERIFY_FAILED transaction=${row.id} : ${(error as Error).message}`,
          );
        }
      }
    }
    if (rechecked > 0 || expired > 0) {
      this.logger.log(
        `Rattrapage Mobile Money : ${rechecked} re-interrogées, ${expired} expirées.`,
      );
    }
    return { rechecked, expired };
  }

  private async safeVerify(row: PendingRow): Promise<void> {
    const handler = this.router.handlerFor(row.purpose);
    if (!handler || !row.external_reference) return;
    try {
      await handler.verifyNow(row.organization_id, row.id, { origin: 'RECONCILE' });
    } catch (error) {
      this.logger.warn(
        `MOMO.RECONCILE_VERIFY_FAILED transaction=${row.id} : ${(error as Error).message}`,
      );
    }
  }

  /**
   * INITIATED d'un fournisseur à initiation idempotente (OpenPay) dont la réponse a été perdue :
   * aucune référence fournisseur, donc rien à interroger. Rejouer `initiate()` avec la MÊME clé
   * et les MÊMES paramètres renvoie la transaction d'origine (doc : en-tête `Idempotency-Key`)
   * MAIS la CRÉE si la requête d'origine n'est jamais arrivée : le payeur recevrait alors un push
   * USSD inattendu bien après coup (double paiement probable). Le rejeu n'a donc lieu que :
   * - dans une courte fenêtre (`INITIATION_REPLAY_*_AGE_MINUTES`) ;
   * - si l'initiation d'origine s'est terminée sur un DÉLAI DÉPASSÉ (`INITIATION_TIMEOUT`, la
   *   requête a pu arriver), jamais sur une connexion refusée ni une cause inconnue ;
   * - si aucune autre transaction du même locataire/facture n'a été tentée ou n'a abouti depuis.
   * Sinon la transaction est marquée « initiation incertaine » (`INITIATION_UNCERTAIN`, une alerte) :
   * elle n'est jamais rejouée, et un succès tardif signalé par callback sera alerté (EXPIRED).
   * `true` : référence retrouvée (la ligne est reprise par la vérification, pas expirée ce tour-ci).
   */
  private async recoverInitiation(row: PendingRow, now: Date): Promise<boolean> {
    if (
      row.purpose === 'OWNER_PAYOUT' ||
      row.aggregator_transaction_id ||
      !row.external_reference ||
      !row.aggregator
    ) {
      return false;
    }
    const operator = detectOperator(row.payer_msisdn);
    const handler = this.router.handlerFor(row.purpose);
    if (!operator || !handler) return false;
    try {
      const provider = this.registry.forCode(row.aggregator);
      if (!provider.idempotentInitiation) return false;
      if (!isInitiationReplayable(row.initiated_at, now)) {
        // Fenêtre dépassée sans référence : trop tard pour rejouer sans risque.
        if (
          now.getTime() - row.initiated_at.getTime() >=
          INITIATION_REPLAY_MAX_AGE_MINUTES * 60_000
        ) {
          await this.markInitiationUncertain(row, 'fenêtre de rejeu dépassée');
        }
        return false;
      }
      if (row.failure_code !== 'INITIATION_TIMEOUT') {
        await this.markInitiationUncertain(
          row,
          `cause de l'échec d'initiation « ${row.failure_code ?? 'inconnue'} » : la requête n'est peut-être jamais arrivée, rejeu refusé`,
        );
        return false;
      }
      if (await this.hasLaterAttempt(row)) {
        await this.markInitiationUncertain(
          row,
          'une autre transaction du même locataire/facture a été tentée depuis : rejeu refusé',
        );
        return false;
      }
      const replayed = await provider.initiate({
        amount: row.amount,
        currency: 'XAF',
        payerMsisdn: row.payer_msisdn,
        operator,
        externalReference: row.external_reference,
        description: '',
        callbackUrl: buildMomoNotifyUrl(this.config, provider.code),
      });
      const stored = await this.prisma.withTenant(row.organization_id, null, (tx) =>
        tx.mobile_money_transactions.updateMany({
          where: { id: row.id, status: 'INITIATED', aggregator_transaction_id: null },
          data: { aggregator_transaction_id: replayed.providerReference, failure_code: null },
        }),
      );
      if (stored.count === 0) return false;
      this.logger.warn(
        `MOMO.INITIATION_RECOVERED transaction=${row.id} : référence ${replayed.providerReference} retrouvée par rejeu idempotent`,
      );
      await handler.verifyNow(row.organization_id, row.id, { origin: 'RECONCILE' });
      return true;
    } catch (error) {
      this.logger.warn(
        `MOMO.INITIATION_RECOVERY_FAILED transaction=${row.id} : ${(error as Error).message}`,
      );
      return false;
    }
  }

  /** Une autre transaction du même locataire/facture, tentée depuis celle-ci, est en cours ou a abouti. */
  private async hasLaterAttempt(row: PendingRow): Promise<boolean> {
    const found = await this.adminClient().$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM mobile_money_transactions
        WHERE organization_id = $1::uuid AND id <> $2::uuid AND channel = 'AGGREGATOR'
          AND purpose = $3::momo_purpose AND initiated_at >= $4
          AND status IN ('INITIATED', 'PENDING', 'SUCCEEDED')
          AND (($5::uuid IS NOT NULL OR $6::uuid IS NOT NULL)
               AND tenant_id IS NOT DISTINCT FROM $5::uuid
               AND invoice_id IS NOT DISTINCT FROM $6::uuid
               OR ($5::uuid IS NULL AND $6::uuid IS NULL AND payer_msisdn = $7))
        LIMIT 1`,
      row.organization_id,
      row.id,
      row.purpose,
      row.initiated_at,
      row.tenant_id,
      row.invoice_id,
      row.payer_msisdn,
    );
    return found.length > 0;
  }

  /** Une seule alerte : la marque `INITIATION_UNCERTAIN` n'est posée (et journalisée) qu'une fois. */
  private async markInitiationUncertain(row: PendingRow, reason: string): Promise<void> {
    const marked = await this.prisma.withTenant(row.organization_id, null, (tx) =>
      tx.mobile_money_transactions.updateMany({
        where: {
          id: row.id,
          status: 'INITIATED',
          aggregator_transaction_id: null,
          OR: [{ failure_code: null }, { failure_code: { not: 'INITIATION_UNCERTAIN' } }],
        },
        data: {
          failure_code: 'INITIATION_UNCERTAIN',
          failure_message: `Initiation incertaine : ${reason}`.slice(0, 500),
        },
      }),
    );
    if (marked.count > 0) {
      this.logger.error(
        `MOMO.INITIATION_UNCERTAIN transaction=${row.id} organisation=${row.organization_id} : ${reason}. Aucun rejeu automatique ; un push USSD a pu partir (succès tardif signalé si callback).`,
      );
    }
  }

  /**
   * Reversement non conclu après `OWNER_PAYOUT_EXPIRY_MINUTES` : dernière interrogation (un
   * callback perdu), puis, si le fournisseur sait annuler un retrait (`cancelPayout`), annulation
   * AVANT d'expirer. Un retrait qui n'est plus annulable (déjà approuvé ou exécuté) n'est PAS
   * expiré : alerte d'exploitation, la ligne reste suivie. `true` si expiré.
   */
  private async expirePayout(row: PendingRow): Promise<boolean> {
    await this.safeVerify(row);
    const current = await this.prisma.withTenant(row.organization_id, null, (tx) =>
      tx.mobile_money_transactions.findFirst({
        where: { id: row.id },
        select: { status: true, payout_alert_code: true },
      }),
    );
    if (current?.status !== 'PENDING') return false;
    // Déjà signalé non annulable (alerte BLOCKED) : le retrait n'est plus `pending` chez le fournisseur
    // (il ne le redeviendra pas) ; inutile de renvoyer un DELETE voué au 400 toutes les 5 minutes.
    // La décision est humaine (résolution), dont l'annulation éventuelle.
    if (current.payout_alert_code === 'BLOCKED' || current.payout_alert_code === 'LATE_SUCCESS') {
      return false;
    }
    try {
      const provider = this.registry.forCode(row.aggregator ?? 'SIMULATOR');
      if (provider.cancelPayout) {
        const reference = row.aggregator_transaction_id ?? row.external_reference;
        if (!reference || (await provider.cancelPayout(reference)) !== 'CANCELLED') {
          await this.payouts.alertOnce(
            row.organization_id,
            row.id,
            'BLOCKED',
            'MOMO.PAYOUT_EXPIRY_BLOCKED',
            "retrait non annulable chez le fournisseur (approuvé ou exécuté ?), non expiré : vérifier chez le fournisseur puis résoudre (action d'administration du reversement).",
          );
          return false;
        }
      }
    } catch (error) {
      this.logger.warn(
        `MOMO.PAYOUT_CANCEL_FAILED transaction=${row.id} : ${(error as Error).message}`,
      );
      return false;
    }
    return this.expire(row.organization_id, row.id);
  }

  /** `true` si la transaction a bien été expirée (elle peut avoir évolué entre-temps). */
  private async expire(organizationId: string, transactionId: string): Promise<boolean> {
    return this.prisma.withTenant(organizationId, null, async (tx) => {
      const row = await tx.mobile_money_transactions.findFirst({
        where: { id: transactionId, status: { in: ['INITIATED', 'PENDING'] } },
        select: { id: true, payment_id: true, status: true, purpose: true },
      });
      if (!row) return false;
      assertMomoTransition(row.status, 'EXPIRED');
      // Garde atomique : si une confirmation ou un échec concurrent a déjà fait évoluer la ligne
      // (verrou de ligne de la vérification), la condition ne correspond plus et rien n'est écrit.
      const updated = await tx.mobile_money_transactions.updateMany({
        where: { id: transactionId, status: row.status as MomoStatus },
        data: { status: 'EXPIRED' },
      });
      if (updated.count === 0) return false;
      if (row.purpose === 'OWNER_PAYOUT') {
        await this.payouts.notifyOutcome(tx, {
          organizationId,
          momoTransactionId: transactionId,
          state: 'EXPIRED',
        });
      }
      if (row.payment_id) {
        await tx.payments.update({
          where: { id: row.payment_id },
          data: { status: 'CANCELLED' },
        });
      }
      await audit(this.auditService, tx, {
        organizationId,
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.MOMO_EXPIRED,
        entityType: 'mobile_money_transactions',
        entityId: transactionId,
        previousState: toJsonState({ status: row.status }),
        newState: toJsonState({ status: 'EXPIRED' }),
      });
      return true;
    });
  }

  private adminClient(): PrismaClient {
    const admin = this.prisma.adminClient();
    if (!admin)
      throw new DomainError('PLATFORM.INTERNAL_ERROR', { reason: 'DATABASE_ADMIN_URL absent' });
    return admin;
  }
}
