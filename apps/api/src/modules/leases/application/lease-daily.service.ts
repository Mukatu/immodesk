import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppConfigService } from '../../../shared/config/config.module';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { startOfDay, toIsoDate } from '../domain/calendar';

export interface LeaseDailyReport {
  organizations: number;
  noticesClosed: number;
  leasesExpired: number;
  leasesRenewed: number;
  revisionsApplied: number;
  unitsReleased: number;
}

const EMPTY_REPORT: LeaseDailyReport = {
  organizations: 0,
  noticesClosed: 0,
  leasesExpired: 0,
  leasesRenewed: 0,
  revisionsApplied: 0,
  unitsReleased: 0,
};

/**
 * Travaux quotidiens sur les baux, tels que les décrit le contrat de la
 * phase 2 : clôture des préavis échus, expiration ou reconduction des baux
 * au terme, application des révisions de loyer devenues effectives.
 *
 * IDEMPOTENT PAR CONSTRUCTION : chaque requête ne sélectionne que les lignes
 * qui ne sont PAS encore dans l'état voulu. Rejouer le passage — après un
 * incident, ou deux fois le même jour — ne produit donc aucune écriture
 * supplémentaire, ce qui est la seule garantie tenable pour une tâche de
 * fond : un verrou distribué peut expirer, un état déjà atteint ne ment pas.
 */
@Injectable()
export class LeaseDailyService {
  private readonly logger = new Logger(LeaseDailyService.name);
  private admin: PrismaClient | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly config: AppConfigService,
  ) {}

  async disconnect(): Promise<void> {
    if (this.admin) await this.admin.$disconnect();
    this.admin = null;
  }

  /** Un passage complet, toutes organisations confondues. */
  async runOnce(today: Date = startOfDay(new Date())): Promise<LeaseDailyReport> {
    const organizationIds = await this.organizationsWithLeases();
    const report = { ...EMPTY_REPORT, organizations: organizationIds.length };

    for (const organizationId of organizationIds) {
      const partial = await this.runForOrganization(organizationId, today);
      report.noticesClosed += partial.noticesClosed;
      report.leasesExpired += partial.leasesExpired;
      report.leasesRenewed += partial.leasesRenewed;
      report.revisionsApplied += partial.revisionsApplied;
      report.unitsReleased += partial.unitsReleased;
    }

    if (organizationIds.length > 0) {
      this.logger.log(
        `Cron des baux (${toIsoDate(today)}) : ${report.noticesClosed} préavis clos, ` +
          `${report.leasesExpired} expirés, ${report.leasesRenewed} reconduits, ` +
          `${report.revisionsApplied} révisions appliquées, ${report.unitsReleased} lots libérés.`,
      );
    }
    return report;
  }

  /** Un passage pour une organisation, dans SA transaction et sous RLS. */
  async runForOrganization(
    organizationId: string,
    today: Date = startOfDay(new Date()),
  ): Promise<LeaseDailyReport> {
    return this.prisma.withTenant(organizationId, null, async (tx) => {
      const report = { ...EMPTY_REPORT, organizations: 1 };
      report.noticesClosed = await this.closeExpiredNotices(tx, organizationId, today);
      const terms = await this.settleTerms(tx, organizationId, today);
      report.leasesExpired = terms.expired;
      report.leasesRenewed = terms.renewed;
      report.revisionsApplied = await this.applyRevisions(tx, organizationId, today);
      report.unitsReleased = await this.releaseUnits(tx, today);

      if (
        report.noticesClosed +
          report.leasesExpired +
          report.leasesRenewed +
          report.revisionsApplied +
          report.unitsReleased >
        0
      ) {
        await this.auditService.record(tx, {
          organizationId,
          action: 'STATE_TRANSITION',
          operation: AUDIT_OPERATIONS.LEASE_CRON_RUN,
          entityType: 'leases',
          entityId: organizationId,
          actorLabel: 'cron.leases.daily',
          newState: toJsonState({ date: toIsoDate(today), ...report }),
        });
      }
      return report;
    });
  }

  /**
   * Préavis arrivés à terme : NOTICE_GIVEN → TERMINATED, et date limite de
   * restitution du dépôt posée si elle ne l'est pas encore.
   */
  private async closeExpiredNotices(
    tx: TenantClient,
    organizationId: string,
    today: Date,
  ): Promise<number> {
    const closed = await tx.$queryRawUnsafe<Array<{ id: string; move_out_date: Date }>>(
      `UPDATE leases
          SET status = 'TERMINATED', terminated_at = now(), updated_at = now()
        WHERE status = 'NOTICE_GIVEN'
          AND deleted_at IS NULL
          AND move_out_date IS NOT NULL
          AND move_out_date <= $1::date
        RETURNING id, move_out_date`,
      toIsoDate(today),
    );

    for (const lease of closed) {
      await tx.$executeRawUnsafe(
        `UPDATE deposits
            SET refund_due_date = $2::date + 30, updated_at = now()
          WHERE lease_id = $1::uuid AND refund_due_date IS NULL`,
        lease.id,
        toIsoDate(lease.move_out_date),
      );
      await this.auditService.record(tx, {
        organizationId,
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.LEASE_TERMINATED,
        entityType: 'leases',
        entityId: lease.id,
        actorLabel: 'cron.leases.daily',
        previousState: toJsonState({ status: 'NOTICE_GIVEN' }),
        newState: toJsonState({ status: 'TERMINATED', trigger: 'CLOSE_NOTICE' }),
      });
    }
    return closed.length;
  }

  /**
   * Baux au terme : expiration, ou reconduction d'une durée ÉGALE À LA DURÉE
   * INITIALE. `end_date + (end_date − start_date)` en SQL : une soustraction
   * de dates donne un nombre de jours, et l'addition le rend à une date. La
   * durée reconduite est donc exactement celle convenue, sans conversion en
   * mois qui ferait glisser l'échéance d'un jour ou deux chaque année.
   */
  private async settleTerms(
    tx: TenantClient,
    organizationId: string,
    today: Date,
  ): Promise<{ expired: number; renewed: number }> {
    const expired = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `UPDATE leases
          SET status = 'EXPIRED',
              move_out_date = COALESCE(move_out_date, end_date),
              terminated_at = COALESCE(terminated_at, now()),
              updated_at = now()
        WHERE status = 'ACTIVE'
          AND deleted_at IS NULL
          AND auto_renew = false
          AND end_date IS NOT NULL
          AND end_date < $1::date
        RETURNING id`,
      toIsoDate(today),
    );

    const renewed = await tx.$queryRawUnsafe<Array<{ id: string; end_date: Date }>>(
      `UPDATE leases
          SET end_date = end_date + (end_date - start_date), updated_at = now()
        WHERE status = 'ACTIVE'
          AND deleted_at IS NULL
          AND auto_renew = true
          AND end_date IS NOT NULL
          AND end_date < $1::date
        RETURNING id, end_date`,
      toIsoDate(today),
    );

    for (const lease of expired) {
      await this.auditService.record(tx, {
        organizationId,
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.LEASE_EXPIRED,
        entityType: 'leases',
        entityId: lease.id,
        actorLabel: 'cron.leases.daily',
        previousState: toJsonState({ status: 'ACTIVE' }),
        newState: toJsonState({ status: 'EXPIRED', trigger: 'EXPIRE' }),
      });
    }
    for (const lease of renewed) {
      await this.auditService.record(tx, {
        organizationId,
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.LEASE_RENEWED,
        entityType: 'leases',
        entityId: lease.id,
        actorLabel: 'cron.leases.daily',
        newState: toJsonState({ endDate: toIsoDate(lease.end_date) }),
      });
    }
    return { expired: expired.length, renewed: renewed.length };
  }

  /**
   * Applique la dernière révision devenue effective.
   *
   * La clause `IS DISTINCT FROM` fait toute l'idempotence : un bail déjà
   * aligné n'est pas réécrit, et le compte rendu du second passage est
   * vide plutôt que faussement actif.
   */
  private async applyRevisions(
    tx: TenantClient,
    organizationId: string,
    today: Date,
  ): Promise<number> {
    const applied = await tx.$queryRawUnsafe<Array<{ id: string; revision_id: string }>>(
      `WITH latest AS (
         SELECT DISTINCT ON (r.lease_id)
                r.lease_id, r.id, r.new_rent_amount, r.new_charges_amount
           FROM lease_rent_revisions r
          WHERE r.effective_date <= $1::date
          ORDER BY r.lease_id, r.effective_date DESC
       )
       UPDATE leases l
          SET rent_amount = latest.new_rent_amount,
              charges_amount = latest.new_charges_amount,
              updated_at = now()
         FROM latest
        WHERE l.id = latest.lease_id
          AND l.deleted_at IS NULL
          AND (l.rent_amount IS DISTINCT FROM latest.new_rent_amount
            OR l.charges_amount IS DISTINCT FROM latest.new_charges_amount)
        RETURNING l.id, latest.id AS revision_id`,
      toIsoDate(today),
    );

    for (const row of applied) {
      await this.auditService.record(tx, {
        organizationId,
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.LEASE_RENT_REVISION_APPLIED,
        entityType: 'leases',
        entityId: row.id,
        actorLabel: 'cron.leases.daily',
        newState: toJsonState({ revisionId: row.revision_id, date: toIsoDate(today) }),
      });
    }
    return applied.length;
  }

  /**
   * Libère les lots dont plus aucun bail n'est en cours.
   *
   * La double condition — aucun bail ACTIVE ou NOTICE_GIVEN, au moins un bail
   * clos — évite de rendre disponible un lot qu'aucun bail n'a jamais occupé
   * mais qu'un gestionnaire a mis en OCCUPIED à la main.
   */
  private async releaseUnits(tx: TenantClient, today: Date): Promise<number> {
    const released = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `UPDATE units u
          SET status = 'AVAILABLE', updated_at = now()
        WHERE u.status = 'OCCUPIED'
          AND u.deleted_at IS NULL
          AND NOT EXISTS (
                SELECT 1 FROM leases l
                 WHERE l.unit_id = u.id AND l.deleted_at IS NULL
                   AND l.status IN ('ACTIVE', 'NOTICE_GIVEN'))
          AND EXISTS (
                SELECT 1 FROM leases l2
                 WHERE l2.unit_id = u.id
                   AND l2.status IN ('TERMINATED', 'EXPIRED')
                   AND COALESCE(l2.move_out_date, l2.end_date, current_date) <= $1::date)
        RETURNING u.id`,
      toIsoDate(today),
    );
    return released.length;
  }

  /**
   * Organisations portant au moins un bail vivant.
   *
   * Seule lecture transverse de la tâche : une tâche de fond n'a pas
   * d'organisation courante. Elle emprunte la connexion d'administration,
   * comme `DocumentPurgeService`. Toutes les ÉCRITURES qui suivent repassent
   * par `withTenant`, et donc par la RLS.
   */
  private async organizationsWithLeases(): Promise<string[]> {
    const adminUrl = this.config.get('DATABASE_ADMIN_URL');
    if (!adminUrl) {
      this.logger.warn('DATABASE_ADMIN_URL absent : cron des baux désactivé.');
      return [];
    }
    if (!this.admin) {
      this.admin = new PrismaClient({ datasources: { db: { url: adminUrl } }, log: ['error'] });
      await this.admin.$connect();
    }

    const rows = await this.admin.$queryRawUnsafe<Array<{ organization_id: string }>>(
      `SELECT DISTINCT organization_id
         FROM leases
        WHERE deleted_at IS NULL
          AND status IN ('DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'NOTICE_GIVEN')`,
    );
    return rows.map((r) => r.organization_id);
  }
}
