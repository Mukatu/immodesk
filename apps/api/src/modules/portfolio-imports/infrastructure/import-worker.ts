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
import { PortfolioImportsService } from '../application/portfolio-imports.service';
import type {
  ImportJobData,
  ImportJobResult,
  ImportJobView,
  ImportQueuePort,
} from '../domain/import-queue.port';

export const IMPORT_QUEUE_NAME = 'portfolio-imports';

/**
 * File BullMQ de l'import de portefeuille — même construction « `Queue` +
 * `Worker` bruts dans une seule classe » que `reporting/infrastructure/
 * export-worker.ts` (contrat, arbitrage n°3 : reprend EXACTEMENT le
 * mécanisme des exports). Aucune déclaration à ajouter à `app.module.ts`.
 *
 * `attempts: 1`, à la différence des exports : un import a des effets de
 * bord (biens, lots, locataires, baux créés) — le rejouer automatiquement
 * après un échec partiel créerait des doublons plutôt que de simplement
 * régénérer un fichier.
 */
@Injectable()
export class ImportWorker implements ImportQueuePort, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImportWorker.name);
  private queue: Queue<ImportJobData, ImportJobResult> | null = null;
  private worker: Worker<ImportJobData, ImportJobResult> | null = null;
  private connection: Redis | null = null;

  constructor(
    private readonly config: AppConfigService,
    @Inject(forwardRef(() => PortfolioImportsService))
    private readonly imports: PortfolioImportsService,
  ) {}

  onModuleInit(): void {
    const prefix = this.config.get('QUEUE_PREFIX');
    try {
      this.connection = createBullConnection(this.config.get('REDIS_URL'));
      this.queue = new Queue(IMPORT_QUEUE_NAME, { connection: this.connection, prefix });
      this.worker = new Worker<ImportJobData, ImportJobResult>(
        IMPORT_QUEUE_NAME,
        (job) => this.process(job),
        { connection: this.connection, prefix, concurrency: 1 },
      );
      this.worker.on('failed', (job, error) =>
        this.logger.error(`Import en échec (job ${job?.id}) : ${error.message}`),
      );
      this.logger.log(`File « ${IMPORT_QUEUE_NAME} » démarrée.`);
    } catch (error) {
      this.logger.warn(`File d'import non démarrée : ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
  }

  /**
   * File réduite en pratique : un balayage des travaux non terminés suffit,
   * pas besoin d'un verrou dédié ni d'une table de suivi.
   */
  async hasRunning(organizationId: string): Promise<boolean> {
    if (!this.queue) return false;
    const jobs = await this.queue.getJobs(['waiting', 'active', 'delayed'], 0, 200);
    return jobs.some((job) => job.data.organizationId === organizationId);
  }

  async enqueue(data: ImportJobData): Promise<{ jobId: string }> {
    if (!this.queue) {
      throw new DomainError('DOCUMENTS.STORAGE_UNAVAILABLE', {
        reason: 'IMPORT_QUEUE_UNAVAILABLE',
      });
    }
    const jobId = `import-${data.organizationId}-${newId()}`;
    await this.queue.add(IMPORT_QUEUE_NAME, data, {
      jobId,
      attempts: 1,
      removeOnComplete: { age: 86_400, count: 500 },
      removeOnFail: { age: 86_400, count: 500 },
    });
    return { jobId };
  }

  async status(jobId: string): Promise<ImportJobView | null> {
    if (!this.queue) return null;
    const job = await this.queue.getJob(jobId);
    if (!job) return null;
    const organizationId = job.data.organizationId;
    const state = await job.getState();
    if (state === 'completed') {
      return { organizationId, status: 'COMPLETED', result: job.returnvalue };
    }
    if (state === 'failed') {
      return { organizationId, status: 'FAILED', error: job.failedReason ?? "Échec de l'import." };
    }
    if (state === 'active') return { organizationId, status: 'ACTIVE' };
    return { organizationId, status: 'QUEUED' };
  }

  private async process(job: Job<ImportJobData>): Promise<ImportJobResult> {
    const { organizationId, userId, documentId } = job.data;
    return this.imports.run(organizationId, userId, documentId);
  }
}
