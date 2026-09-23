import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import type Redis from 'ioredis';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { createBullConnection } from '../../../shared/queue/bull-connection';
import { ErasureJobRunnerService } from '../application/erasure-job-runner.service';
import type {
  ErasureJobData,
  ErasureJobResult,
  ErasureJobView,
  ErasureQueuePort,
} from '../domain/erasure-queue.port';
import type { SubjectType } from '../domain/subject';

export const ERASURE_QUEUE_NAME = 'privacy-erasures';

/**
 * File BullMQ de l'exécution des effacements. Même construction que
 * `reporting/infrastructure/export-worker.ts` (phase 9) : `Queue` + `Worker`
 * bruts dans une seule classe, pas de `BullModule.forRootAsync`, rien à
 * déclarer dans `app.module.ts`. `findRunning` (parcours des jobs
 * `waiting`/`active`) est ce que `ErasureService.request` interroge pour
 * détecter un effacement déjà en cours sur le MÊME tiers — voir le port pour
 * la raison de ne PAS utiliser un `jobId` déterministe.
 */
@Injectable()
export class ErasureWorker implements ErasureQueuePort, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ErasureWorker.name);
  private queue: Queue<ErasureJobData, ErasureJobResult> | null = null;
  private worker: Worker<ErasureJobData, ErasureJobResult> | null = null;
  private connection: Redis | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly runner: ErasureJobRunnerService,
  ) {}

  onModuleInit(): void {
    const prefix = this.config.get('QUEUE_PREFIX');
    try {
      this.connection = createBullConnection(this.config.get('REDIS_URL'));
      this.queue = new Queue(ERASURE_QUEUE_NAME, { connection: this.connection, prefix });
      this.worker = new Worker<ErasureJobData, ErasureJobResult>(
        ERASURE_QUEUE_NAME,
        (job) => this.process(job),
        { connection: this.connection, prefix, concurrency: 1 },
      );
      this.worker.on('failed', (job, error) =>
        this.logger.error(`Effacement en échec (job ${job?.id}) : ${error.message}`),
      );
      this.logger.log(`File « ${ERASURE_QUEUE_NAME} » démarrée.`);
    } catch (error) {
      this.logger.warn(`File d'effacement non démarrée : ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
  }

  async enqueue(data: ErasureJobData): Promise<{ jobId: string }> {
    if (!this.queue) {
      throw new DomainError('DOCUMENTS.STORAGE_UNAVAILABLE', {
        reason: 'ERASURE_QUEUE_UNAVAILABLE',
      });
    }
    // Identifiant UNIQUE à chaque appel : un identifiant déterministe
    // heurterait un job déjà `COMPLETED` encore en rétention (voir le
    // commentaire du port). `ErasureService.request` a déjà écarté, par
    // `findRunning`, le cas d'un effacement en cours sur ce même tiers.
    const jobId = `erasure-${data.organizationId}-${data.subjectType}-${data.subjectId}-${newId()}`;
    await this.queue.add(ERASURE_QUEUE_NAME, data, {
      jobId,
      attempts: 1, // Une anonymisation ne se rejoue jamais toute seule : un échec exige un nouvel effacement demandé explicitement.
      removeOnComplete: { age: 86_400, count: 500 },
      removeOnFail: { age: 86_400, count: 500 },
    });
    return { jobId };
  }

  async findRunning(
    organizationId: string,
    subjectType: Exclude<SubjectType, 'user'>,
    subjectId: string,
  ): Promise<ErasureJobView | null> {
    if (!this.queue) return null;
    const jobs = await this.queue.getJobs(['waiting', 'active']);
    const found = jobs.find(
      (job) =>
        job.data.organizationId === organizationId &&
        job.data.subjectType === subjectType &&
        job.data.subjectId === subjectId,
    );
    if (!found) return null;
    const state = await found.getState();
    return {
      organizationId,
      subjectType,
      subjectId,
      status: state === 'active' ? 'ACTIVE' : 'QUEUED',
    };
  }

  async status(jobId: string): Promise<ErasureJobView | null> {
    if (!this.queue) return null;
    const job = await this.queue.getJob(jobId);
    if (!job) return null;
    const { organizationId, subjectType, subjectId } = job.data;
    const state = await job.getState();
    if (state === 'completed') {
      return {
        organizationId,
        subjectType,
        subjectId,
        status: 'COMPLETED',
        result: job.returnvalue,
      };
    }
    if (state === 'failed') {
      return {
        organizationId,
        subjectType,
        subjectId,
        status: 'FAILED',
        error: job.failedReason ?? "Échec de l'effacement.",
      };
    }
    if (state === 'active') return { organizationId, subjectType, subjectId, status: 'ACTIVE' };
    return { organizationId, subjectType, subjectId, status: 'QUEUED' };
  }

  private async process(job: Job<ErasureJobData>): Promise<ErasureJobResult> {
    return this.runner.run(job.data);
  }
}
