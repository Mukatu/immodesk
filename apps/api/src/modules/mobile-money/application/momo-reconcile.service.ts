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
  PENDING_MIN_AGE_MINUTES,
  isDueForRecheck,
  isExpired,
  isInitiatedExpired,
} from '../domain/reconcile-rules';
import { assertMomoTransition } from '../domain/momo-rules';
import type { MomoPurpose } from '../domain/momo-purpose';
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
  ) {}

  async reconcilePending(now: Date = new Date()): Promise<{ rechecked: number; expired: number }> {
    const admin = this.adminClient();
    const rows = await admin.$queryRawUnsafe<PendingRow[]>(
      `SELECT id, organization_id, status, initiated_at, status_checked_at, status_check_count, external_reference, purpose
         FROM mobile_money_transactions
        WHERE channel = 'AGGREGATOR'
          AND ((status = 'PENDING' AND initiated_at <= now() - make_interval(mins => $1::int))
            OR (status = 'INITIATED' AND initiated_at <= now() - make_interval(mins => $2::int)))`,
      PENDING_MIN_AGE_MINUTES,
      INITIATED_MIN_AGE_MINUTES,
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

      if (row.status === 'PENDING' && isExpired(row.initiated_at, now, pendingExpiryMinutes)) {
        await this.expire(row.organization_id, row.id);
        expired += 1;
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
          await handler.verifyNow(row.organization_id, row.id);
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
      await handler.verifyNow(row.organization_id, row.id);
    } catch (error) {
      this.logger.warn(
        `MOMO.RECONCILE_VERIFY_FAILED transaction=${row.id} : ${(error as Error).message}`,
      );
    }
  }

  /** `true` si la transaction a bien été expirée (elle peut avoir évolué entre-temps). */
  private async expire(organizationId: string, transactionId: string): Promise<boolean> {
    return this.prisma.withTenant(organizationId, null, async (tx) => {
      const row = await tx.mobile_money_transactions.findFirst({
        where: { id: transactionId, status: { in: ['INITIATED', 'PENDING'] } },
        select: { id: true, payment_id: true, status: true },
      });
      if (!row) return false;
      assertMomoTransition(row.status, 'EXPIRED');
      await tx.mobile_money_transactions.update({
        where: { id: transactionId },
        data: { status: 'EXPIRED' },
      });
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
