import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import type Redis from 'ioredis';
import { AppConfigService } from '../../../shared/config/config.module';
import { createBullConnection } from '../../../shared/queue/bull-connection';
import { LeaseDailyService, type LeaseDailyReport } from '../application/lease-daily.service';

export const LEASE_DAILY_QUEUE = 'lease-daily';
/** Identifiant FIXE du job répétable : deux instances n'en créent qu'un. */
export const LEASE_DAILY_JOB_ID = 'lease-daily-cron';

/**
 * Planification BullMQ du cron quotidien des baux.
 *
 * POURQUOI UN JOB RÉPÉTABLE ET NON UN `setInterval` — l'API tourne en
 * plusieurs instances derrière le reverse proxy. Un intervalle local
 * s'exécuterait N fois par jour, une fois par instance. BullMQ, lui, place
 * le job dans Redis : `LEASE_DAILY_JOB_ID` étant fixe, la Nième instance
 * remplace la planification au lieu d'en ajouter une, et un seul worker
 * décroche chaque exécution.
 *
 * Le traitement est de toute façon IDEMPOTENT (`LeaseDailyService`) : une
 * double exécution ne produirait aucune écriture supplémentaire. La
 * planification unique évite le travail inutile, l'idempotence protège du
 * reste.
 */
@Injectable()
export class LeaseCronScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LeaseCronScheduler.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private connection: Redis | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly daily: LeaseDailyService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.get('LEASES_CRON_ENABLED') || this.config.isTest) return;

    const pattern = this.config.get('LEASES_CRON_PATTERN');
    const tz = this.config.get('LEASES_CRON_TIMEZONE');
    const prefix = this.config.get('QUEUE_PREFIX');

    try {
      this.connection = createBullConnection(this.config.get('REDIS_URL'));
      this.queue = new Queue(LEASE_DAILY_QUEUE, { connection: this.connection, prefix });
      this.worker = new Worker(LEASE_DAILY_QUEUE, () => this.daily.runOnce(), {
        connection: this.connection,
        prefix,
        concurrency: 1,
      });
      this.worker.on('failed', (job, error) =>
        this.logger.error(`Cron des baux en échec (job ${job?.id}) : ${error.message}`),
      );

      // `upsertJobScheduler` remplace l'API `repeat` retirée en BullMQ 6 :
      // l'identifiant fixe met à jour la planification au lieu d'en empiler
      // une nouvelle à chaque redémarrage d'instance.
      await this.queue.upsertJobScheduler(
        LEASE_DAILY_JOB_ID,
        { pattern, tz },
        {
          name: LEASE_DAILY_JOB_ID,
          data: {},
          opts: { removeOnComplete: 20, removeOnFail: 50 },
        },
      );
      this.logger.log(`Cron des baux planifié : « ${pattern} » (${tz}).`);
    } catch (error) {
      // Redis indisponible ne doit pas empêcher l'API de servir : le cron est
      // un confort d'exploitation, `runOnce()` reste appelable à la main.
      this.logger.warn(`Cron des baux non planifié : ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
    await this.daily.disconnect();
  }

  /** Exécution immédiate, pour l'exploitation et les tests. */
  async runNow(): Promise<LeaseDailyReport> {
    return this.daily.runOnce();
  }
}
