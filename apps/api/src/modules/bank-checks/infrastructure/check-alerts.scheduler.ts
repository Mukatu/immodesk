import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import type Redis from 'ioredis';
import { AppConfigService } from '../../../shared/config/config.module';
import { createBullConnection } from '../../../shared/queue/bull-connection';
import { CheckAlertsService } from '../application/check-alerts.service';

export const CHECK_ALERT_QUEUE = 'bank-check-alerts';
/** Identifiant FIXE du job répétable : N instances n'en créent qu'un. */
export const CHECK_ALERT_JOB_ID = 'bank-check-alerts-cron';

/**
 * Planification BullMQ de l'alerte quotidienne des chèques `DEPOSITED` non
 * compensés (docs/api/phase6-contract.md, § « Chèques »). Même mécanique
 * que `BillingCronScheduler` (phase 2/3) : job répétable à identifiant fixe,
 * traitement idempotent, Redis indisponible = cron désactivé sans jamais
 * empêcher l'API de servir.
 */
@Injectable()
export class CheckAlertsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CheckAlertsScheduler.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private connection: Redis | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly alerts: CheckAlertsService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.get('CHECK_ALERT_CRON_ENABLED') || this.config.isTest) return;

    const pattern = this.config.get('CHECK_ALERT_CRON_PATTERN');
    const tz = this.config.get('CHECK_ALERT_CRON_TIMEZONE');
    const prefix = this.config.get('QUEUE_PREFIX');
    try {
      this.connection = createBullConnection(this.config.get('REDIS_URL'));
      this.queue = new Queue(CHECK_ALERT_QUEUE, { connection: this.connection, prefix });
      this.worker = new Worker(CHECK_ALERT_QUEUE, () => this.alerts.run(), {
        connection: this.connection,
        prefix,
        concurrency: 1,
      });
      this.worker.on('failed', (job, error) =>
        this.logger.error(`Alerte chèques en échec (job ${job?.id}) : ${error.message}`),
      );
      await this.queue.upsertJobScheduler(
        CHECK_ALERT_JOB_ID,
        { pattern, tz },
        { name: CHECK_ALERT_JOB_ID, data: {}, opts: { removeOnComplete: 20, removeOnFail: 50 } },
      );
      this.logger.log(`Alerte chèques planifiée : « ${pattern} » (${tz}).`);
    } catch (error) {
      this.logger.warn(`Alerte chèques non planifiée : ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
  }
}
