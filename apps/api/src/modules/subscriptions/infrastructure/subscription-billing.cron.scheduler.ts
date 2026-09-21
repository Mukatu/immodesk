import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import type Redis from 'ioredis';
import { AppConfigService } from '../../../shared/config/config.module';
import { createBullConnection } from '../../../shared/queue/bull-connection';
import { SubscriptionBillingRunService } from '../application/subscription-billing-run.service';

export const SUBSCRIPTION_BILLING_QUEUE = 'subscription-billing-daily';
export const SUBSCRIPTION_BILLING_JOB_ID = 'subscription-billing-daily-cron';

/**
 * Planification BullMQ du cron quotidien de l'abonnement (contrat phase 10,
 * livrable 7), à 05:00 Africa/Brazzaville — après le cron des baux (02:00) et
 * de facturation loyers (03:00), pour ne jamais concurrencer leurs écritures.
 * `SUBSCRIPTION_BILLING_DAY_OF_MONTH` et `SUBSCRIPTION_DEFAULT_GRACE_DAYS`
 * sont des paramètres MÉTIER lus par `SubscriptionBillingRunService` (et à la
 * souscription) — le rythme d'exécution du cron lui-même reste quotidien et
 * fixe, seul moyen de détecter à temps un dépassement d'échéance ou de délai
 * de grâce quel que soit le jour où il tombe.
 *
 * Même dégradation que `BillingCronScheduler` : Redis indisponible = cron
 * désactivé, sans jamais empêcher l'API de servir.
 */
@Injectable()
export class SubscriptionBillingCronScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SubscriptionBillingCronScheduler.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private connection: Redis | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly run: SubscriptionBillingRunService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.get('SUBSCRIPTION_CRON_ENABLED') || this.config.isTest) return;

    const prefix = this.config.get('QUEUE_PREFIX');
    try {
      this.connection = createBullConnection(this.config.get('REDIS_URL'));
      this.queue = new Queue(SUBSCRIPTION_BILLING_QUEUE, { connection: this.connection, prefix });
      this.worker = new Worker(SUBSCRIPTION_BILLING_QUEUE, () => this.run.runDaily(), {
        connection: this.connection,
        prefix,
        concurrency: 1,
      });
      this.worker.on('failed', (job, error) =>
        this.logger.error(`Cron abonnement en échec (job ${job?.id}) : ${error.message}`),
      );
      await this.queue.upsertJobScheduler(
        SUBSCRIPTION_BILLING_JOB_ID,
        { pattern: '0 5 * * *', tz: 'Africa/Brazzaville' },
        {
          name: SUBSCRIPTION_BILLING_JOB_ID,
          data: {},
          opts: { removeOnComplete: 20, removeOnFail: 50 },
        },
      );
      this.logger.log('Cron abonnement planifié : « 0 5 * * * » (Africa/Brazzaville).');
    } catch (error) {
      this.logger.warn(`Cron abonnement non planifié : ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
  }
}
