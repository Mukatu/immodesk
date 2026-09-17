import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  forwardRef,
} from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import type Redis from 'ioredis';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { createBullConnection } from '../../../shared/queue/bull-connection';
import { ExportsService } from '../application/exports.service';
import type {
  ExportJobData,
  ExportJobResult,
  ExportJobView,
  ExportQueuePort,
} from '../domain/export-queue.port';

export const EXPORT_QUEUE_NAME = 'reporting-exports';

/**
 * File BullMQ des exports volumineux (au-delà d'`EXPORT_SYNC_ROW_LIMIT`
 * lignes). Même construction « `Queue` + `Worker` bruts dans une seule
 * classe » que `LeaseContractWorker` (module `pdf`) : pas de
 * `BullModule.forRootAsync`, donc rien à déclarer dans `app.module.ts`, que
 * la phase 9 n'a pas le droit de modifier.
 *
 * Aucune nouvelle variable d'environnement n'est requise pour ce worker : il
 * réutilise `REDIS_URL` et `QUEUE_PREFIX`, déjà dans la configuration
 * globale, et démarre par défaut comme le worker de notifications — une
 * connexion Redis absente ne fait pas échouer le démarrage de l'API (avertit
 * seulement), exactement comme les autres workers BullMQ du dépôt.
 */
@Injectable()
export class ExportWorker implements ExportQueuePort, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExportWorker.name);
  private queue: Queue<ExportJobData, ExportJobResult> | null = null;
  private worker: Worker<ExportJobData, ExportJobResult> | null = null;
  private connection: Redis | null = null;

  constructor(
    private readonly config: AppConfigService,
    // `ExportsService` injecte le jeton `EXPORT_QUEUE` (résolu vers CETTE
    // classe) : le cycle A → jeton → B → A exige `forwardRef` de ce côté,
    // faute de quoi Nest refuse de résoudre l'un des deux fournisseurs.
    @Inject(forwardRef(() => ExportsService)) private readonly exports: ExportsService,
  ) {}

  onModuleInit(): void {
    const prefix = this.config.get('QUEUE_PREFIX');
    try {
      this.connection = createBullConnection(this.config.get('REDIS_URL'));
      this.queue = new Queue(EXPORT_QUEUE_NAME, { connection: this.connection, prefix });
      this.worker = new Worker<ExportJobData, ExportJobResult>(
        EXPORT_QUEUE_NAME,
        (job) => this.process(job),
        { connection: this.connection, prefix, concurrency: 2 },
      );
      this.worker.on('failed', (job, error) =>
        this.logger.error(`Export en échec (job ${job?.id}) : ${error.message}`),
      );
      this.logger.log(`File « ${EXPORT_QUEUE_NAME} » démarrée.`);
    } catch (error) {
      this.logger.warn(`File d'export non démarrée : ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
  }

  async enqueue(data: ExportJobData): Promise<{ jobId: string }> {
    if (!this.queue) {
      throw new DomainError('DOCUMENTS.STORAGE_UNAVAILABLE', {
        reason: 'EXPORT_QUEUE_UNAVAILABLE',
      });
    }
    const jobId = `export-${data.organizationId}-${newId()}`;
    await this.queue.add(EXPORT_QUEUE_NAME, data, {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 86_400, count: 500 },
      removeOnFail: { age: 86_400, count: 500 },
    });
    return { jobId };
  }

  async status(jobId: string): Promise<ExportJobView | null> {
    if (!this.queue) return null;
    const job = await this.queue.getJob(jobId);
    if (!job) return null;
    const organizationId = job.data.organizationId;
    const state = await job.getState();
    if (state === 'completed') {
      return { organizationId, status: 'COMPLETED', result: job.returnvalue };
    }
    if (state === 'failed') {
      return {
        organizationId,
        status: 'FAILED',
        error: job.failedReason ?? 'Échec de la génération.',
      };
    }
    if (state === 'active') return { organizationId, status: 'ACTIVE' };
    return { organizationId, status: 'QUEUED' };
  }

  private async process(job: Job<ExportJobData>): Promise<ExportJobResult> {
    const { organizationId, userId, kind, fileName, filters } = job.data;
    return this.exports.buildAndStore(organizationId, userId, kind, fileName, filters);
  }
}
