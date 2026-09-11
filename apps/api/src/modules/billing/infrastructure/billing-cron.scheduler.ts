import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import type Redis from 'ioredis';
import { AppConfigService } from '../../../shared/config/config.module';
import { createBullConnection } from '../../../shared/queue/bull-connection';
import { BillingRunsService } from '../application/billing-runs.service';

export const BILLING_DAILY_QUEUE = 'billing-daily';
/** Identifiant FIXE du job répétable : N instances n'en créent qu'un. */
export const BILLING_DAILY_JOB_ID = 'billing-daily-cron';

/**
 * Planification BullMQ du cron quotidien de facturation (03:00
 * Africa/Brazzaville) : génération J-N, passage en retard, pénalités.
 * Même mécanique que le cron des baux (phase 2) : job répétable à
 * identifiant fixe, traitement idempotent, Redis indisponible = cron
 * désactivé sans empêcher l'API de servir.
 */
@Injectable()
export class BillingCronScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BillingCronScheduler.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private connection: Redis | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly runs: BillingRunsService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.get('BILLING_CRON_ENABLED') || this.config.isTest) return;

    const pattern = this.config.get('BILLING_CRON_PATTERN');
    const tz = this.config.get('BILLING_CRON_TIMEZONE');
    const prefix = this.config.get('QUEUE_PREFIX');
    try {
      this.connection = createBullConnection(this.config.get('REDIS_URL'));
      this.queue = new Queue(BILLING_DAILY_QUEUE, { connection: this.connection, prefix });
      this.worker = new Worker(BILLING_DAILY_QUEUE, () => this.runs.runAllOrganizations(), {
        connection: this.connection,
        prefix,
        concurrency: 1,
      });
      this.worker.on('failed', (job, error) =>
        this.logger.error(`Cron de facturation en échec (job ${job?.id}) : ${error.message}`),
      );
      await this.queue.upsertJobScheduler(
        BILLING_DAILY_JOB_ID,
        { pattern, tz },
        { name: BILLING_DAILY_JOB_ID, data: {}, opts: { removeOnComplete: 20, removeOnFail: 50 } },
      );
      this.logger.log(`Cron de facturation planifié : « ${pattern} » (${tz}).`);
    } catch (error) {
      this.logger.warn(`Cron de facturation non planifié : ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
  }
}
