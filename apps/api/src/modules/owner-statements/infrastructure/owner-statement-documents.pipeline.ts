import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import type Redis from 'ioredis';
import { AppConfigService } from '../../../shared/config/config.module';
import { createBullConnection } from '../../../shared/queue/bull-connection';
import { OwnerStatementDocumentsService } from '../application/owner-statement-documents.service';

export const OWNER_STATEMENT_DOCUMENTS_QUEUE = 'owner-statement-documents';

export interface OwnerStatementDocumentJob {
  organizationId: string;
  statementId: string;
}

/**
 * File BullMQ PROPRE à `owner-statements` (calquée sur `financial-documents
 * .pipeline.ts` de `receipts`, mais un pipeline par module — chacun reste
 * propriétaire de ses documents, contrat § PDF et envoi) : le PDF du relevé
 * et son envoi sont produits HORS de la requête `POST /{id}/issue`.
 *
 * Même repli que `receipts` sans Redis ou worker désactivé : traitement dans
 * le processus, après la réponse HTTP — l'émission du relevé ne dépend
 * jamais de la file.
 */
@Injectable()
export class OwnerStatementDocumentsPipeline implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OwnerStatementDocumentsPipeline.name);
  private queue: Queue<OwnerStatementDocumentJob> | null = null;
  private worker: Worker<OwnerStatementDocumentJob> | null = null;
  private connection: Redis | null = null;
  private readonly local = new Set<Promise<void>>();

  constructor(
    private readonly config: AppConfigService,
    private readonly documents: OwnerStatementDocumentsService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('PDF_WORKER_ENABLED')) return;
    const prefix = this.config.get('QUEUE_PREFIX');
    try {
      this.connection = createBullConnection(this.config.get('REDIS_URL'));
      this.queue = new Queue(OWNER_STATEMENT_DOCUMENTS_QUEUE, {
        connection: this.connection,
        prefix,
      });
      this.worker = new Worker<OwnerStatementDocumentJob>(
        OWNER_STATEMENT_DOCUMENTS_QUEUE,
        (job) => this.process(job.data),
        {
          connection: this.connection,
          prefix,
          concurrency: this.config.get('PDF_WORKER_CONCURRENCY'),
          lockDuration: this.config.get('PDF_JOB_TIMEOUT_MS'),
        },
      );
      this.worker.on('failed', (job, error) =>
        this.logger.error(`Relevé en échec (job ${job?.id}) : ${error.message}`),
      );
    } catch (error) {
      this.logger.warn(`File des relevés indisponible : ${(error as Error).message}`);
      this.queue = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([...this.local]);
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
  }

  async enqueue(organizationId: string, statementId: string): Promise<void> {
    const job: OwnerStatementDocumentJob = { organizationId, statementId };
    if (this.queue) {
      try {
        await this.queue.add('owner-statement', job, {
          jobId: `owner-statement-${statementId}`,
          attempts: this.config.get('PDF_JOB_ATTEMPTS'),
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { age: 3600, count: 500 },
          removeOnFail: { age: 86_400, count: 500 },
        });
        return;
      } catch (error) {
        this.logger.warn(`Mise en file impossible, traitement local : ${(error as Error).message}`);
      }
    }
    const task = this.process(job)
      .catch((error: Error) =>
        this.logger.error(`Relevé ${statementId} en échec : ${error.message}`),
      )
      .finally(() => this.local.delete(task));
    this.local.add(task);
  }

  /** Exécution directe (exploitation, tests). */
  async process(job: OwnerStatementDocumentJob): Promise<void> {
    await this.documents.generate(job.organizationId, job.statementId, true);
  }
}
