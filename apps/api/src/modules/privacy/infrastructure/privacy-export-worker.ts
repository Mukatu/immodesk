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
import { PrivacyExportsService } from '../application/privacy-exports.service';
import type {
  PrivacyExportJobData,
  PrivacyExportJobResult,
  PrivacyExportJobView,
  PrivacyExportQueuePort,
} from '../domain/privacy-export-queue.port';

export const PRIVACY_EXPORT_QUEUE_NAME = 'privacy-exports';

/**
 * File BullMQ des exports de réversibilité (organisation ou personne).
 * Construction identique à `reporting/infrastructure/export-worker.ts`
 * (phase 9) et à `infrastructure/erasure-worker.ts` de ce module : `Queue` +
 * `Worker` bruts, sans wiring dans `app.module.ts`.
 */
@Injectable()
export class PrivacyExportWorker implements PrivacyExportQueuePort, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrivacyExportWorker.name);
  private queue: Queue<PrivacyExportJobData, PrivacyExportJobResult> | null = null;
  private worker: Worker<PrivacyExportJobData, PrivacyExportJobResult> | null = null;
  private connection: Redis | null = null;

  constructor(
    private readonly config: AppConfigService,
    @Inject(forwardRef(() => PrivacyExportsService))
    private readonly exports: PrivacyExportsService,
  ) {}

  onModuleInit(): void {
    const prefix = this.config.get('QUEUE_PREFIX');
    try {
      this.connection = createBullConnection(this.config.get('REDIS_URL'));
      this.queue = new Queue(PRIVACY_EXPORT_QUEUE_NAME, { connection: this.connection, prefix });
      this.worker = new Worker<PrivacyExportJobData, PrivacyExportJobResult>(
        PRIVACY_EXPORT_QUEUE_NAME,
        (job) => this.process(job),
        { connection: this.connection, prefix, concurrency: 1 },
      );
      this.worker.on('failed', (job, error) =>
        this.logger.error(`Export vie privée en échec (job ${job?.id}) : ${error.message}`),
      );
      this.logger.log(`File « ${PRIVACY_EXPORT_QUEUE_NAME} » démarrée.`);
    } catch (error) {
      this.logger.warn(`File d'export vie privée non démarrée : ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
  }

  async enqueue(data: PrivacyExportJobData): Promise<{ jobId: string }> {
    if (!this.queue) {
      throw new DomainError('DOCUMENTS.STORAGE_UNAVAILABLE', {
        reason: 'PRIVACY_EXPORT_QUEUE_UNAVAILABLE',
      });
    }
    // Toujours unique (voir le commentaire du port) : `PrivacyExportsService.requestOrganizationExport`
    // a déjà écarté, par `findRunningOrganizationExport`, le cas d'un export déjà en cours.
    const jobId = `privacy-${data.kind}-export-${newId()}`;
    await this.queue.add(PRIVACY_EXPORT_QUEUE_NAME, data, {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 86_400, count: 500 },
      removeOnFail: { age: 86_400, count: 500 },
    });
    return { jobId };
  }

  async status(jobId: string): Promise<PrivacyExportJobView | null> {
    if (!this.queue) return null;
    const job = await this.queue.getJob(jobId);
    if (!job) return null;
    const organizationId = job.data.organizationId;
    const state = await job.getState();
    if (state === 'completed')
      return { organizationId, status: 'COMPLETED', result: job.returnvalue };
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

  async findRunningOrganizationExport(
    organizationId: string,
  ): Promise<PrivacyExportJobView | null> {
    if (!this.queue) return null;
    const jobs = await this.queue.getJobs(['waiting', 'active']);
    const found = jobs.find(
      (job) => job.data.kind === 'organization' && job.data.organizationId === organizationId,
    );
    if (!found) return null;
    const state = await found.getState();
    return { organizationId, status: state === 'active' ? 'ACTIVE' : 'QUEUED' };
  }

  private async process(job: Job<PrivacyExportJobData>): Promise<PrivacyExportJobResult> {
    const { kind, organizationId, userId, subjectType, subjectId } = job.data;
    return this.exports.buildAndStore(kind, organizationId, userId, subjectType, subjectId);
  }
}
