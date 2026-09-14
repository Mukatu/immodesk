import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { readOperationalSettings } from '../../../shared/settings/operational-settings';
import { isDueForRecheck, isExpired } from '../domain/reconcile-rules';
import { MomoVerificationService } from './momo-verification.service';

interface PendingRow {
  id: string;
  organization_id: string;
  initiated_at: Date;
  status_checked_at: Date | null;
  status_check_count: number;
}

/**
 * Rattrapage des transactions Mobile Money agrégateur restées `PENDING`
 * (job `momo:reconcile-pending`, contrat phase 4, § « Rattrapage »). Lecture
 * transverse aux organisations par le rôle d'administration — même
 * mécanique que `WebhooksService` (notifications) pour les webhooks entrants,
 * puisqu'un cron n'a pas de tenant courant.
 */
@Injectable()
export class MomoReconcileService {
  private readonly logger = new Logger(MomoReconcileService.name);
  private admin: PrismaClient | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly verification: MomoVerificationService,
    private readonly auditService: AuditService,
  ) {}

  async reconcilePending(now: Date = new Date()): Promise<{ rechecked: number; expired: number }> {
    const admin = this.adminClient();
    const rows = await admin.$queryRawUnsafe<PendingRow[]>(
      `SELECT id, organization_id, initiated_at, status_checked_at, status_check_count
         FROM mobile_money_transactions
        WHERE channel = 'AGGREGATOR' AND status = 'PENDING'
          AND initiated_at <= now() - interval '3 minutes'`,
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

      if (isExpired(row.initiated_at, now, pendingExpiryMinutes)) {
        await this.expire(row.organization_id, row.id);
        expired += 1;
        continue;
      }
      if (isDueForRecheck(row.status_checked_at, row.initiated_at, row.status_check_count, now)) {
        await this.verification.verifyStatus(row.organization_id, row.id);
        rechecked += 1;
      }
    }
    if (rechecked > 0 || expired > 0) {
      this.logger.log(
        `Rattrapage Mobile Money : ${rechecked} re-interrogées, ${expired} expirées.`,
      );
    }
    return { rechecked, expired };
  }

  private async expire(organizationId: string, transactionId: string): Promise<void> {
    await this.prisma.withTenant(organizationId, null, async (tx) => {
      const row = await tx.mobile_money_transactions.findFirst({
        where: { id: transactionId, status: 'PENDING' },
        select: { id: true, payment_id: true },
      });
      if (!row) return;
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
        newState: toJsonState({ status: 'EXPIRED' }),
      });
    });
  }

  private adminClient(): PrismaClient {
    const adminUrl = this.config.get('DATABASE_ADMIN_URL');
    if (!adminUrl)
      throw new DomainError('PLATFORM.INTERNAL_ERROR', { reason: 'DATABASE_ADMIN_URL absent' });
    this.admin ??= new PrismaClient({ datasources: { db: { url: adminUrl } }, log: ['error'] });
    return this.admin;
  }
}
