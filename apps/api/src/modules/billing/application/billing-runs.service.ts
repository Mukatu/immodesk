import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type Redis from 'ioredis';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { REDIS_CLIENT } from '../../../shared/redis/redis.module';
import { businessToday } from '../../../shared/time/business-date';
import { parseIsoDate } from '../../leases/domain/calendar';
import { BillingEngineService } from './billing-engine.service';
import { InvoiceNoticeService } from './invoice-notice.service';

/** Rapport d'une campagne, conservé 7 jours dans Redis. */
export const BILLING_RUN_TTL_SECONDS = 7 * 86_400;

export interface BillingRunReport {
  runId: string;
  organizationId: string;
  status: 'RUNNING' | 'DONE' | 'FAILED';
  startedAt: string;
  finishedAt: string | null;
  created: number;
  skipped: number;
  errors: Array<{ leaseId: string | null; reason: string }>;
  dryRun: boolean;
  periodStart: string | null;
}

/**
 * Campagnes de facturation : manuelle (`POST /v1/billing/runs`) ou
 * quotidienne (cron `billing-daily`).
 *
 * Le rapport vit dans Redis, pas en mémoire de processus : derrière le
 * reverse proxy, la requête de suivi peut atteindre une autre instance que
 * celle qui exécute la campagne.
 */
@Injectable()
export class BillingRunsService implements OnModuleDestroy {
  private readonly logger = new Logger(BillingRunsService.name);
  private readonly inflight = new Map<string, Promise<void>>();
  private admin: PrismaClient | null = null;

  constructor(
    private readonly engine: BillingEngineService,
    private readonly notices: InvoiceNoticeService,
    private readonly config: AppConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([...this.inflight.values()]);
    if (this.admin) await this.admin.$disconnect();
    this.admin = null;
  }

  async start(
    organizationId: string,
    userId: string,
    options: { periodStart?: string; dryRun?: boolean },
  ): Promise<{ runId: string }> {
    const target = options.periodStart ? parseIsoDate(options.periodStart) : null;
    const report: BillingRunReport = {
      runId: newId(),
      organizationId,
      status: 'RUNNING',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      created: 0,
      skipped: 0,
      errors: [],
      dryRun: options.dryRun ?? false,
      periodStart: options.periodStart ?? null,
    };
    await this.save(report);
    const task = this.execute(report, userId, target).finally(() =>
      this.inflight.delete(report.runId),
    );
    this.inflight.set(report.runId, task);
    return { runId: report.runId };
  }

  async get(organizationId: string, runId: string): Promise<BillingRunReport> {
    const raw = await this.redis.get(this.key(runId));
    const report = raw ? (JSON.parse(raw) as BillingRunReport) : null;
    // Une campagne d'une autre organisation est indiscernable d'une campagne inexistante.
    if (!report || report.organizationId !== organizationId) {
      throw new DomainError('BILLING.RUN_NOT_FOUND', { runId });
    }
    return report;
  }

  /** Attend la fin d'une campagne lancée par CETTE instance (exploitation, tests). */
  async waitFor(runId: string): Promise<void> {
    await this.inflight.get(runId);
  }

  /** Passage quotidien : toutes les organisations portant un bail facturable. */
  async runAllOrganizations(
    today: Date = businessToday(),
  ): Promise<{ organizations: number; created: number }> {
    const organizationIds = await this.organizationsWithBillableLeases();
    let created = 0;
    for (const organizationId of organizationIds) {
      try {
        const outcome = await this.engine.runForOrganization(organizationId, {
          today,
          jobLabel: 'billing-daily',
        });
        created += outcome.created;
        await this.notices.notifyIssued(organizationId, outcome.issuedInvoiceIds, null);
      } catch (error) {
        this.logger.error(
          `Facturation de ${organizationId} en échec : ${(error as Error).message}`,
        );
      }
    }
    return { organizations: organizationIds.length, created };
  }

  private async execute(
    report: BillingRunReport,
    userId: string,
    target: Date | null,
  ): Promise<void> {
    try {
      const outcome = await this.engine.runForOrganization(report.organizationId, {
        target,
        dryRun: report.dryRun,
        jobLabel: `billing-run:${report.runId}`,
        actorUserId: userId,
      });
      Object.assign(report, {
        status: 'DONE',
        created: outcome.created,
        skipped: outcome.skipped,
        errors: outcome.errors,
        finishedAt: new Date().toISOString(),
      });
      await this.save(report);
      if (!report.dryRun) {
        await this.notices.notifyIssued(report.organizationId, outcome.issuedInvoiceIds, userId);
      }
    } catch (error) {
      Object.assign(report, {
        status: 'FAILED',
        finishedAt: new Date().toISOString(),
        errors: [
          ...report.errors,
          { leaseId: null, reason: (error as Error).message.slice(0, 300) },
        ],
      });
      await this.save(report).catch(() => undefined);
      this.logger.error(`Campagne ${report.runId} en échec : ${(error as Error).message}`);
    }
  }

  private async save(report: BillingRunReport): Promise<void> {
    await this.redis.set(
      this.key(report.runId),
      JSON.stringify(report),
      'EX',
      BILLING_RUN_TTL_SECONDS,
    );
  }

  private key(runId: string): string {
    return `${this.config.get('QUEUE_PREFIX')}:billing-run:${runId}`;
  }

  /**
   * Seule lecture transverse du cron (une tâche de fond n'a pas
   * d'organisation courante) : connexion d'administration, comme le cron des
   * baux. Toutes les écritures repassent par `withTenant`, donc par la RLS.
   */
  private async organizationsWithBillableLeases(): Promise<string[]> {
    const adminUrl = this.config.get('DATABASE_ADMIN_URL');
    if (!adminUrl) {
      this.logger.warn('DATABASE_ADMIN_URL absent : cron de facturation désactivé.');
      return [];
    }
    this.admin ??= new PrismaClient({ datasources: { db: { url: adminUrl } }, log: ['error'] });
    const rows = await this.admin.$queryRawUnsafe<Array<{ organization_id: string }>>(
      `SELECT DISTINCT organization_id FROM leases
        WHERE deleted_at IS NULL AND status IN ('ACTIVE', 'NOTICE_GIVEN')`,
    );
    return rows.map((r) => r.organization_id);
  }
}
