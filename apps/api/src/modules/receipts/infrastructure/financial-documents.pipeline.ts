import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  forwardRef,
} from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import type Redis from 'ioredis';
import { AppConfigService } from '../../../shared/config/config.module';
import { createBullConnection } from '../../../shared/queue/bull-connection';
import type { CashReceiptPublisher } from '../../cash/domain/ports';
import { ReceiptDocumentsService } from '../application/receipt-documents.service';

export const FINANCIAL_DOCUMENTS_QUEUE = 'financial-documents';

export interface FinancialDocumentJob {
  kind: 'RECEIPT' | 'CASH_RECEIPT';
  organizationId: string;
  id: string;
  notify: boolean;
}

/**
 * File BullMQ des documents financiers : quittances et reçus de caisse sont
 * rendus en PDF puis envoyés, HORS de la requête HTTP.
 *
 * Même régime que le contrat de bail (§ 2) : concurrence bornée, reprise
 * exponentielle. Sans Redis ou avec le worker désactivé, le traitement se
 * fait dans le processus, après la réponse : l'encaissement ne dépend jamais
 * de la file.
 */
@Injectable()
export class FinancialDocumentsPipeline
  implements OnModuleInit, OnModuleDestroy, CashReceiptPublisher
{
  private readonly logger = new Logger(FinancialDocumentsPipeline.name);
  private queue: Queue<FinancialDocumentJob> | null = null;
  private worker: Worker<FinancialDocumentJob> | null = null;
  private connection: Redis | null = null;
  private readonly local = new Set<Promise<void>>();

  constructor(
    private readonly config: AppConfigService,
    @Inject(forwardRef(() => ReceiptDocumentsService))
    private readonly documents: ReceiptDocumentsService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('PDF_WORKER_ENABLED')) return;
    const prefix = this.config.get('QUEUE_PREFIX');
    try {
      this.connection = createBullConnection(this.config.get('REDIS_URL'));
      this.queue = new Queue(FINANCIAL_DOCUMENTS_QUEUE, { connection: this.connection, prefix });
      this.worker = new Worker<FinancialDocumentJob>(
        FINANCIAL_DOCUMENTS_QUEUE,
        (job) => this.process(job.data),
        {
          connection: this.connection,
          prefix,
          concurrency: this.config.get('PDF_WORKER_CONCURRENCY'),
          lockDuration: this.config.get('PDF_JOB_TIMEOUT_MS'),
        },
      );
      this.worker.on('failed', (job, error) =>
        this.logger.error(`Document financier en échec (job ${job?.id}) : ${error.message}`),
      );
    } catch (error) {
      this.logger.warn(`File des documents financiers indisponible : ${(error as Error).message}`);
      this.queue = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([...this.local]);
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
  }

  async enqueueReceipts(organizationId: string, receiptIds: readonly string[]): Promise<void> {
    for (const id of receiptIds) {
      await this.enqueue({ kind: 'RECEIPT', organizationId, id, notify: true });
    }
  }

  /** Port `CASH_RECEIPT_PUBLISHER`. */
  async schedule(
    organizationId: string,
    cashReceiptId: string,
    options: { notify: boolean },
  ): Promise<void> {
    await this.enqueue({
      kind: 'CASH_RECEIPT',
      organizationId,
      id: cashReceiptId,
      notify: options.notify,
    });
  }

  /** Exécution directe (exploitation, tests). */
  async process(job: FinancialDocumentJob): Promise<void> {
    if (job.kind === 'RECEIPT')
      await this.documents.generateReceipt(job.organizationId, job.id, job.notify);
    else await this.documents.generateCashReceipt(job.organizationId, job.id, job.notify);
  }

  private async enqueue(job: FinancialDocumentJob): Promise<void> {
    if (this.queue) {
      try {
        await this.queue.add(job.kind, job, {
          jobId: `${job.kind.toLowerCase()}-${job.id}`,
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
        this.logger.error(`Document ${job.kind} ${job.id} en échec : ${error.message}`),
      )
      .finally(() => this.local.delete(task));
    this.local.add(task);
  }
}
