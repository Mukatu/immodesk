import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import type Redis from 'ioredis';
import { AppConfigService } from '../../../shared/config/config.module';
import { createBullConnection } from '../../../shared/queue/bull-connection';
import { OwnerStatementsRunsService } from '../application/owner-statements-runs.service';

export const AGENCY_MONTHLY_QUEUE = 'agency-monthly';
/** Identifiant FIXE du job répétable : N instances n'en créent qu'un (pattern `billing-daily`). */
export const AGENCY_MONTHLY_JOB_ID = 'agency-monthly-cron';

/**
 * Planification BullMQ du cron `agency-monthly` (contrat § Campagne) —
 * QUOTIDIEN malgré son nom (`AGENCY_MONTHLY_CRON_PATTERN` par défaut
 * `0 4 * * *`) : chaque exécution ne traite que les mandats dont
 * `payout_day` tombe le jour même (`OwnerStatementsRunsService.runDueToday`),
 * pour le mois civil précédent. Calqué à l'identique sur
 * `billing/infrastructure/billing-cron.scheduler.ts`.
 */
@Injectable()
export class OwnerStatementsCronScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OwnerStatementsCronScheduler.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private connection: Redis | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly runs: OwnerStatementsRunsService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.get('AGENCY_MONTHLY_CRON_ENABLED') || this.config.isTest) return;

    const pattern = this.config.get('AGENCY_MONTHLY_CRON_PATTERN');
    const tz = this.config.get('AGENCY_MONTHLY_CRON_TIMEZONE');
    const prefix = this.config.get('QUEUE_PREFIX');
    try {
      this.connection = createBullConnection(this.config.get('REDIS_URL'));
      this.queue = new Queue(AGENCY_MONTHLY_QUEUE, { connection: this.connection, prefix });
      this.worker = new Worker(AGENCY_MONTHLY_QUEUE, () => this.runs.runDueToday(), {
        connection: this.connection,
        prefix,
        concurrency: 1,
      });
      this.worker.on('failed', (job, error) =>
        this.logger.error(`Cron agence en échec (job ${job?.id}) : ${error.message}`),
      );
      await this.queue.upsertJobScheduler(
        AGENCY_MONTHLY_JOB_ID,
        { pattern, tz },
        { name: AGENCY_MONTHLY_JOB_ID, data: {}, opts: { removeOnComplete: 20, removeOnFail: 50 } },
      );
      this.logger.log(`Cron agence planifié : « ${pattern} » (${tz}).`);
    } catch (error) {
      this.logger.warn(`Cron agence non planifié : ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
  }
}
