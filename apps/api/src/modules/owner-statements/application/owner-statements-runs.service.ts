import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type Redis from 'ioredis';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { REDIS_CLIENT } from '../../../shared/redis/redis.module';
import { businessToday, monthBounds } from '../../../shared/time/business-date';
import { previousMonthPeriod } from '../domain/owner-statement-rules';
import { OwnerStatementsCampaignService } from './owner-statements-campaign.service';

/** Rapport d'une campagne, conservé 7 jours dans Redis (même durée que `billing`). */
export const OWNER_STATEMENT_RUN_TTL_SECONDS = 7 * 86_400;

export interface OwnerStatementRunReport {
  runId: string;
  organizationId: string;
  status: 'RUNNING' | 'DONE' | 'FAILED';
  startedAt: string;
  finishedAt: string | null;
  created: number;
  skipped: number;
  errors: Array<{ mandateId: string; reason: string }>;
  periodStart: string;
  periodEnd: string;
}

/**
 * Campagnes de relevés : manuelle (`POST /v1/owner-statements/runs`) ou
 * quotidienne (cron `agency-monthly`, voir `owner-statements-cron.scheduler.ts`).
 * Calqué sur `BillingRunsService` (`billing/application/billing-runs.service.ts`) :
 * le rapport vit dans Redis, pas en mémoire de processus.
 */
@Injectable()
export class OwnerStatementsRunsService implements OnModuleDestroy {
  private readonly logger = new Logger(OwnerStatementsRunsService.name);
  private readonly inflight = new Map<string, Promise<void>>();
  private admin: PrismaClient | null = null;

  constructor(
    private readonly campaign: OwnerStatementsCampaignService,
    private readonly config: AppConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([...this.inflight.values()]);
    if (this.admin) await this.admin.$disconnect();
    this.admin = null;
  }

  /** `POST /v1/owner-statements/runs` : période par défaut = mois civil précédent. */
  async start(
    organizationId: string,
    userId: string,
    options: { period?: string },
  ): Promise<{ runId: string }> {
    const bounds = options.period
      ? monthBounds(options.period)
      : previousMonthPeriod(businessToday());
    if (!bounds) {
      throw new DomainError('VALIDATION.INVALID_PAYLOAD', { period: 'Format AAAA-MM attendu.' });
    }
    const report: OwnerStatementRunReport = {
      runId: newId(),
      organizationId,
      status: 'RUNNING',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      created: 0,
      skipped: 0,
      errors: [],
      periodStart: bounds.start.toISOString().slice(0, 10),
      periodEnd: bounds.end.toISOString().slice(0, 10),
    };
    await this.save(report);
    const task = this.execute(report, userId, bounds).finally(() =>
      this.inflight.delete(report.runId),
    );
    this.inflight.set(report.runId, task);
    return { runId: report.runId };
  }

  /** `GET /v1/owner-statements/runs/{runId}`. */
  async get(organizationId: string, runId: string): Promise<OwnerStatementRunReport> {
    const raw = await this.redis.get(this.key(runId));
    const report = raw ? (JSON.parse(raw) as OwnerStatementRunReport) : null;
    // Une campagne d'une autre organisation est indiscernable d'une campagne inexistante.
    if (!report || report.organizationId !== organizationId) {
      throw new DomainError('AGENCY.STATEMENT_RUN_NOT_FOUND', { runId });
    }
    return report;
  }

  /** Attend la fin d'une campagne lancée par CETTE instance (exploitation, tests). */
  async waitFor(runId: string): Promise<void> {
    await this.inflight.get(runId);
  }

  private async execute(
    report: OwnerStatementRunReport,
    userId: string,
    bounds: { start: Date; end: Date },
  ): Promise<void> {
    try {
      const outcome = await this.campaign.runForOrganization(
        report.organizationId,
        bounds.start,
        bounds.end,
        { actorUserId: userId, jobLabel: `owner-statement-run:${report.runId}` },
      );
      Object.assign(report, {
        status: 'DONE',
        created: outcome.created,
        skipped: outcome.skipped,
        errors: outcome.errors,
        finishedAt: new Date().toISOString(),
      });
      await this.save(report);
    } catch (error) {
      Object.assign(report, {
        status: 'FAILED',
        finishedAt: new Date().toISOString(),
        errors: [
          ...report.errors,
          { mandateId: '', reason: (error as Error).message.slice(0, 300) },
        ],
      });
      await this.save(report).catch(() => undefined);
      this.logger.error(`Campagne ${report.runId} en échec : ${(error as Error).message}`);
    }
  }

  private async save(report: OwnerStatementRunReport): Promise<void> {
    await this.redis.set(
      this.key(report.runId),
      JSON.stringify(report),
      'EX',
      OWNER_STATEMENT_RUN_TTL_SECONDS,
    );
  }

  private key(runId: string): string {
    return `${this.config.get('QUEUE_PREFIX')}:owner-statement-run:${runId}`;
  }

  /**
   * Cron `agency-monthly` : toutes les organisations portant un mandat dont
   * `payout_day` tombe AUJOURD'HUI, pour le mois civil précédent.
   */
  async runDueToday(
    today: Date = businessToday(),
  ): Promise<{ organizations: number; created: number }> {
    const organizationIds = await this.organizationsWithMandatesDueToday(today);
    const bounds = previousMonthPeriod(today);
    let created = 0;
    for (const organizationId of organizationIds) {
      try {
        const outcome = await this.campaign.runForOrganization(
          organizationId,
          bounds.start,
          bounds.end,
          {
            payoutDayFilter: today.getUTCDate(),
            actorUserId: null,
            jobLabel: 'agency-monthly',
          },
        );
        created += outcome.created;
      } catch (error) {
        this.logger.error(
          `Campagne agence de ${organizationId} en échec : ${(error as Error).message}`,
        );
      }
    }
    return { organizations: organizationIds.length, created };
  }

  /**
   * Seule lecture transverse du cron (pattern `BillingRunsService.
   * organizationsWithBillableLeases`) : connexion d'administration, JAMAIS
   * de RLS ici — toutes les écritures repassent par `withTenant`.
   */
  private async organizationsWithMandatesDueToday(today: Date): Promise<string[]> {
    const adminUrl = this.config.get('DATABASE_ADMIN_URL');
    if (!adminUrl) {
      this.logger.warn('DATABASE_ADMIN_URL absent : cron agence désactivé.');
      return [];
    }
    this.admin ??= new PrismaClient({ datasources: { db: { url: adminUrl } }, log: ['error'] });
    const rows = await this.admin.$queryRawUnsafe<Array<{ organization_id: string }>>(
      `SELECT DISTINCT organization_id FROM management_mandates
        WHERE status IN ('ACTIVE', 'TERMINATED') AND payout_day = $1`,
      today.getUTCDate(),
    );
    return rows.map((r) => r.organization_id);
  }
}
