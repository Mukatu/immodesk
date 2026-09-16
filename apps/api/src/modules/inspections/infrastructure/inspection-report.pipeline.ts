import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import type Redis from 'ioredis';
import { AppConfigService } from '../../../shared/config/config.module';
import { createBullConnection } from '../../../shared/queue/bull-connection';
import { InspectionReportService } from '../application/inspection-report.service';

export const INSPECTION_REPORT_QUEUE = 'inspection-report';

export interface InspectionReportJob {
  organizationId: string;
  inspectionId: string;
}

/**
 * File BullMQ propre à `inspections` (calquée sur
 * `OwnerStatementDocumentsPipeline`) : la génération du rapport PDF est
 * mise en file à la signature (contrat § États des lieux, « met en file la
 * génération du rapport PDF ») et produite HORS de la requête `POST
 * .../sign`. Sans Redis ou worker désactivé, traitement local après la
 * réponse HTTP — la signature n'attend jamais la file.
 */
@Injectable()
export class InspectionReportPipeline implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InspectionReportPipeline.name);
  private queue: Queue<InspectionReportJob> | null = null;
  private worker: Worker<InspectionReportJob> | null = null;
  private connection: Redis | null = null;
  private readonly local = new Set<Promise<void>>();

  constructor(
    private readonly config: AppConfigService,
    private readonly reports: InspectionReportService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('PDF_WORKER_ENABLED')) return;
    const prefix = this.config.get('QUEUE_PREFIX');
    try {
      this.connection = createBullConnection(this.config.get('REDIS_URL'));
      this.queue = new Queue(INSPECTION_REPORT_QUEUE, { connection: this.connection, prefix });
      this.worker = new Worker<InspectionReportJob>(
        INSPECTION_REPORT_QUEUE,
        (job) => this.process(job.data),
        {
          connection: this.connection,
          prefix,
          concurrency: this.config.get('PDF_WORKER_CONCURRENCY'),
          lockDuration: this.config.get('PDF_JOB_TIMEOUT_MS'),
        },
      );
      this.worker.on('failed', (job, error) =>
        this.logger.error(`Rapport en échec (job ${job?.id}) : ${error.message}`),
      );
    } catch (error) {
      this.logger.warn(`File des rapports indisponible : ${(error as Error).message}`);
      this.queue = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([...this.local]);
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
  }

  async enqueue(organizationId: string, inspectionId: string): Promise<void> {
    const job: InspectionReportJob = { organizationId, inspectionId };
    if (this.queue) {
      try {
        await this.queue.add('inspection-report', job, {
          jobId: `inspection-report-${inspectionId}`,
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
        this.logger.error(`Rapport ${inspectionId} en échec : ${error.message}`),
      )
      .finally(() => this.local.delete(task));
    this.local.add(task);
  }

  /** Exécution directe (exploitation, tests). */
  async process(job: InspectionReportJob): Promise<void> {
    await this.reports.generate(job.organizationId, job.inspectionId);
  }
}
