import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Queue, Worker } from 'bullmq';
import type Redis from 'ioredis';
import { AppConfigService } from '../../../shared/config/config.module';
import { createBullConnection } from '../../../shared/queue/bull-connection';
import { DunningEngineService } from '../application/dunning-engine.service';

export const DUNNING_DAILY_QUEUE = 'dunning-daily';
/** Identifiant FIXE du job répétable : N instances n'en créent qu'un. */
export const DUNNING_DAILY_JOB_ID = 'dunning-daily-cron';

/**
 * Planification BullMQ du moteur de relance (contrat, § « Exécution
 * quotidienne ») : « à l'heure la plus basse configurée parmi les règles
 * actives, puis toutes les heures jusqu'à la plus haute ».
 *
 * ÉCART DOCUMENTÉ : plutôt que de recalculer et réenregistrer dynamiquement
 * les bornes [min, max] à chaque modification de `dunning_rules` (les règles
 * sont mutables par CRUD, tranche 1), le job répétable tourne toutes les
 * heures, 24 h/24. C'est le moteur (`DunningEngineService.scanOrganization`,
 * via `isHourReached`) qui refuse tout envoi tant que l'heure locale
 * Africa/Brazzaville n'a pas atteint `sendHourLocal` de chaque règle :
 * aucun envoi nocturne n'est donc possible, au prix de 24 passages bon
 * marché par jour plutôt qu'une fenêtre bornée. Même mécanique que le cron
 * des baux et de la facturation (job répétable à identifiant fixe, Redis
 * indisponible = cron désactivé sans empêcher l'API de servir).
 */
@Injectable()
export class DunningCronScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DunningCronScheduler.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private connection: Redis | null = null;
  private admin: PrismaClient | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly engine: DunningEngineService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.get('DUNNING_CRON_ENABLED') || this.config.isTest) return;

    const prefix = this.config.get('QUEUE_PREFIX');
    try {
      this.connection = createBullConnection(this.config.get('REDIS_URL'));
      this.queue = new Queue(DUNNING_DAILY_QUEUE, { connection: this.connection, prefix });
      this.worker = new Worker(DUNNING_DAILY_QUEUE, () => this.runAllOrganizations(), {
        connection: this.connection,
        prefix,
        concurrency: 1,
      });
      this.worker.on('failed', (job, error) =>
        this.logger.error(`Cron de relance en échec (job ${job?.id}) : ${error.message}`),
      );
      await this.queue.upsertJobScheduler(
        DUNNING_DAILY_JOB_ID,
        { pattern: '0 * * * *', tz: 'Africa/Brazzaville' },
        { name: DUNNING_DAILY_JOB_ID, data: {}, opts: { removeOnComplete: 20, removeOnFail: 50 } },
      );
      this.logger.log('Cron de relance planifié : chaque heure (Africa/Brazzaville).');
    } catch (error) {
      this.logger.warn(`Cron de relance non planifié : ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
    if (this.admin) await this.admin.$disconnect();
  }

  /**
   * Toutes les organisations portant au moins une règle de relance active.
   * Lecture transverse via `DATABASE_ADMIN_URL`, comme le cron de facturation
   * (`organizationsWithBillableLeases`) : une tâche de fond n'a pas
   * d'organisation courante, toutes les écritures repassent ensuite par
   * `withTenant` (RLS).
   */
  async runAllOrganizations(now: Date = new Date()): Promise<{ organizations: number }> {
    const adminUrl = this.config.get('DATABASE_ADMIN_URL');
    if (!adminUrl) {
      this.logger.warn('DATABASE_ADMIN_URL absent : cron de relance désactivé.');
      return { organizations: 0 };
    }
    this.admin ??= new PrismaClient({ datasources: { db: { url: adminUrl } }, log: ['error'] });
    const rows = await this.admin.$queryRawUnsafe<Array<{ organization_id: string }>>(
      `SELECT DISTINCT organization_id FROM dunning_rules WHERE is_active`,
    );
    const maxPerHour = this.config.get('DUNNING_MAX_RUNS_PER_HOUR');
    for (const { organization_id: organizationId } of rows) {
      try {
        const report = await this.engine.scanOrganization(organizationId, {
          now,
          ignoreHourGate: false,
        });
        if (report.created >= maxPerHour) {
          this.logger.warn(
            `Organisation ${organizationId} : ${report.created} relances créées, ` +
              `plafond horaire ${maxPerHour} atteint ou dépassé.`,
          );
        }
      } catch (error) {
        this.logger.error(`Relance de ${organizationId} en échec : ${(error as Error).message}`);
      }
    }
    return { organizations: rows.length };
  }
}
