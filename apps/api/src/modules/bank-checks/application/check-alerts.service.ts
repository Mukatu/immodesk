import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppConfigService } from '../../../shared/config/config.module';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { notifyManagers } from '../../../shared/notify/notify-managers';
import { toJsonAmount } from '../../../shared/money/amount';
import { readOperationalSettings } from '../../../shared/settings/operational-settings';
import { businessToday } from '../../../shared/time/business-date';
import { MESSAGE_TEMPLATE_CODES } from '../../notifications/domain/template-codes';
import { NOTIFICATION_ENQUEUER, type NotificationEnqueuer } from '../../notifications/domain/ports';
import { businessDaysBetween } from '../domain/business-days';

interface DueCheckRow {
  id: string;
  check_number: string;
  amount: bigint;
  deposit_date: Date;
}

/**
 * Alerte quotidienne des chèques `DEPOSITED` non compensés depuis plus de
 * `checkClearingAlertDays` jours OUVRÉS (docs/api/phase6-contract.md,
 * § « Chèques »). Même charpente multi-organisation que
 * `BillingRunsService.runAllOrganizations` : une connexion d'administration
 * hors RLS pour lister les organisations concernées, puis un traitement par
 * organisation dans son propre contexte tenant.
 */
@Injectable()
export class CheckAlertsService {
  private readonly logger = new Logger(CheckAlertsService.name);
  private admin: PrismaClient | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    @Optional()
    @Inject(NOTIFICATION_ENQUEUER)
    private readonly enqueuer: NotificationEnqueuer | null = null,
  ) {}

  async run(today: Date = businessToday()): Promise<{ organizations: number; alerted: number }> {
    const organizationIds = await this.organizationsWithDepositedChecks();
    let alerted = 0;
    for (const organizationId of organizationIds) {
      try {
        alerted += await this.runForOrganization(organizationId, today);
      } catch (error) {
        this.logger.error(
          `Alerte chèques de ${organizationId} en échec : ${(error as Error).message}`,
        );
      }
    }
    return { organizations: organizationIds.length, alerted };
  }

  private async runForOrganization(organizationId: string, today: Date): Promise<number> {
    return this.prisma.withTenant(organizationId, null, async (tx) => {
      const settingsRow = await tx.organization_settings.findUnique({
        where: { organization_id: organizationId },
        select: { settings_json: true },
      });
      const alertDays = readOperationalSettings(settingsRow?.settings_json).reconciliation
        .checkClearingAlertDays;
      const checks = await tx.$queryRawUnsafe<DueCheckRow[]>(
        `SELECT id, check_number, amount, deposit_date FROM bank_checks
          WHERE organization_id = $1::uuid AND status = 'DEPOSITED' AND deposit_date IS NOT NULL`,
        organizationId,
      );
      const dateKey = today.toISOString().slice(0, 10);
      let count = 0;
      for (const check of checks) {
        if (businessDaysBetween(check.deposit_date, today) <= alertDays) continue;
        await notifyManagers(tx, this.enqueuer, organizationId, {
          templateCode: MESSAGE_TEMPLATE_CODES.BANK_CHECK_UNCLEARED,
          variables: {
            checkNumber: check.check_number,
            amount: toJsonAmount(check.amount).toString(),
            depositDate: check.deposit_date.toISOString().slice(0, 10),
          },
          relatedEntity: { type: 'bank_checks', id: check.id },
          dedupeKey: `bank-check-uncleared:${check.id}:${dateKey}`,
        });
        count += 1;
      }
      return count;
    });
  }

  /** Organisations portant au moins un chèque `DEPOSITED`, hors RLS. */
  private async organizationsWithDepositedChecks(): Promise<string[]> {
    const adminUrl = this.config.get('DATABASE_ADMIN_URL');
    if (!adminUrl) {
      this.logger.warn('DATABASE_ADMIN_URL absent : alerte chèques désactivée.');
      return [];
    }
    this.admin ??= new PrismaClient({ datasources: { db: { url: adminUrl } }, log: ['error'] });
    const rows = await this.admin.$queryRawUnsafe<Array<{ organization_id: string }>>(
      `SELECT DISTINCT organization_id FROM bank_checks
        WHERE status = 'DEPOSITED' AND deposit_date IS NOT NULL`,
    );
    return rows.map((r) => r.organization_id);
  }
}
