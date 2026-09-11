import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import type Redis from 'ioredis';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { createBullConnection } from '../../../shared/queue/bull-connection';
import {
  LeaseContractService,
  type LeaseContractJobData,
  type LeaseContractJobResult,
} from '../application/lease-contract.service';

export const LEASE_CONTRACT_QUEUE = 'lease-contract';

export type ContractJobStatus = 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED';

export interface ContractJobView {
  jobId: string;
  status: ContractJobStatus;
  leaseDocumentId?: string;
  documentId?: string;
  version?: number;
  error?: string;
}

/**
 * Worker BullMQ dédié à la génération des contrats.
 *
 * DÉDIÉ, et non partagé avec le cron des baux : un rendu Chromium mobilise
 * des centaines de mégaoctets et peut durer plusieurs secondes. Le mêler aux
 * tâches courtes ferait attendre celles-ci derrière celui-là. La concurrence
 * est bornée (`PDF_WORKER_CONCURRENCY`, 2 par défaut) et les échecs sont
 * rejoués avec un délai croissant — le plan de phases identifie explicitement
 * l'instabilité du worker Puppeteer comme un risque (§ 2.10).
 */
@Injectable()
export class LeaseContractWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LeaseContractWorker.name);
  private queue: Queue<LeaseContractJobData, LeaseContractJobResult> | null = null;
  private worker: Worker<LeaseContractJobData, LeaseContractJobResult> | null = null;
  private connection: Redis | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly contracts: LeaseContractService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('PDF_WORKER_ENABLED')) {
      this.logger.log('Worker PDF désactivé par configuration.');
      return;
    }

    const prefix = this.config.get('QUEUE_PREFIX');
    try {
      this.connection = createBullConnection(this.config.get('REDIS_URL'));
      this.queue = new Queue(LEASE_CONTRACT_QUEUE, { connection: this.connection, prefix });
      this.worker = new Worker<LeaseContractJobData, LeaseContractJobResult>(
        LEASE_CONTRACT_QUEUE,
        (job) => this.contracts.process(job.data),
        {
          connection: this.connection,
          prefix,
          concurrency: this.config.get('PDF_WORKER_CONCURRENCY'),
          lockDuration: this.config.get('PDF_JOB_TIMEOUT_MS'),
        },
      );
      this.worker.on('failed', (job, error) =>
        this.logger.error(`Contrat PDF en échec (job ${job?.id}) : ${error.message}`),
      );
      this.logger.log(
        `Worker « ${LEASE_CONTRACT_QUEUE} » démarré (concurrence ${this.config.get(
          'PDF_WORKER_CONCURRENCY',
        )}).`,
      );
    } catch (error) {
      this.logger.warn(`Worker PDF non démarré : ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
  }

  /**
   * Met un contrat en file.
   *
   * Un bail ne peut avoir qu'un travail en vol : deux rendus simultanés du
   * même bail produiraient deux versions identiques, numérotées v2 et v3, ce
   * qu'aucun gestionnaire ne saurait expliquer à son bailleur.
   */
  async enqueue(data: LeaseContractJobData): Promise<{ jobId: string; status: 'QUEUED' }> {
    const queue = this.requireQueue();
    await this.assertNotInProgress(queue, data.leaseId);

    const jobId = `contract-${data.leaseId}-${newId()}`;
    await queue.add(LEASE_CONTRACT_QUEUE, data, {
      jobId,
      attempts: this.config.get('PDF_JOB_ATTEMPTS'),
      backoff: { type: 'exponential', delay: 2000 },
      // Les travaux terminés sont conservés : la route de statut doit encore
      // pouvoir répondre quelques minutes après la fin du rendu.
      removeOnComplete: { age: 3600, count: 200 },
      removeOnFail: { age: 86_400, count: 200 },
    });
    await this.contracts.traceRequest(data, jobId);
    return { jobId, status: 'QUEUED' };
  }

  /** État d'un travail. Un identifiant inconnu est un 404, jamais un 200 vide. */
  async status(leaseId: string, jobId: string): Promise<ContractJobView> {
    const queue = this.requireQueue();
    const job = await queue.getJob(jobId);
    if (!job || job.data.leaseId !== leaseId) {
      throw new DomainError('LEASES.CONTRACT_JOB_NOT_FOUND', { leaseId, jobId });
    }

    const state = await job.getState();
    const status = toStatus(state);
    const result = job.returnvalue;

    return {
      jobId,
      status,
      ...(result
        ? {
            leaseDocumentId: result.leaseDocumentId,
            documentId: result.documentId,
            version: result.version,
          }
        : {}),
      ...(status === 'FAILED' ? { error: job.failedReason ?? 'Échec de la génération.' } : {}),
    };
  }

  private requireQueue(): Queue<LeaseContractJobData, LeaseContractJobResult> {
    if (!this.queue) {
      throw new DomainError('LEASES.CONTRACT_UNAVAILABLE', { reason: 'QUEUE_UNAVAILABLE' });
    }
    return this.queue;
  }

  private async assertNotInProgress(
    queue: Queue<LeaseContractJobData, LeaseContractJobResult>,
    leaseId: string,
  ): Promise<void> {
    const pending = await queue.getJobs(['waiting', 'active', 'delayed'], 0, 200);
    const inFlight = pending.find(
      (job: Job<LeaseContractJobData>) => job.data?.leaseId === leaseId,
    );
    if (inFlight) {
      throw new DomainError('LEASES.CONTRACT_IN_PROGRESS', { leaseId, jobId: inFlight.id });
    }
  }
}

function toStatus(state: string): ContractJobStatus {
  switch (state) {
    case 'completed':
      return 'DONE';
    case 'failed':
      return 'FAILED';
    case 'active':
      return 'RUNNING';
    default:
      return 'QUEUED';
  }
}
