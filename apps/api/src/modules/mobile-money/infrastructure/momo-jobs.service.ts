import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import type Redis from 'ioredis';
import { AppConfigService } from '../../../shared/config/config.module';
import { createBullConnection } from '../../../shared/queue/bull-connection';
import { MomoReconcileService } from '../application/momo-reconcile.service';
import { MomoVerificationService } from '../application/momo-verification.service';
import { MOMO_VERIFY_QUEUE_NAME, type VerifyStatusJobData } from './momo-verify.queue';

export const MOMO_RECONCILE_QUEUE = 'momo-reconcile-pending';
export const MOMO_RECONCILE_JOB_ID = 'momo-reconcile-pending-cron';

/**
 * Consomme `momo:verify-status` et planifie le job répétable
 * `momo:reconcile-pending` toutes les 5 minutes (contrat phase 4). Le
 * worker de vérification reste actif en test (les scénarios d'intégration
 * en dépendent) ; seul le PLANIFICATEUR périodique est désactivé hors
 * production, comme le cron de facturation — les tests appellent
 * `MomoReconcileService.reconcilePending()` directement.
 */
@Injectable()
export class MomoJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MomoJobsService.name);
  private verifyWorker: Worker<VerifyStatusJobData> | null = null;
  private reconcileQueue: Queue | null = null;
  private reconcileWorker: Worker | null = null;
  private connection: Redis | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly verification: MomoVerificationService,
    private readonly reconcile: MomoReconcileService,
  ) {}

  async onModuleInit(): Promise<void> {
    const prefix = this.config.get('QUEUE_PREFIX');
    try {
      this.connection = createBullConnection(this.config.get('REDIS_URL'));
      this.verifyWorker = new Worker<VerifyStatusJobData>(
        MOMO_VERIFY_QUEUE_NAME,
        (job) => this.verification.verifyStatus(job.data.organizationId, job.data.transactionId),
        { connection: this.connection, prefix, concurrency: 4 },
      );
      this.verifyWorker.on('failed', (job, error) =>
        this.logger.error(`momo:verify-status en échec (job ${job?.id}) : ${error.message}`),
      );

      if (this.config.isTest) return;
      this.reconcileQueue = new Queue(MOMO_RECONCILE_QUEUE, {
        connection: this.connection,
        prefix,
      });
      this.reconcileWorker = new Worker(
        MOMO_RECONCILE_QUEUE,
        () => this.reconcile.reconcilePending(),
        { connection: this.connection, prefix, concurrency: 1 },
      );
      await this.reconcileQueue.upsertJobScheduler(
        MOMO_RECONCILE_JOB_ID,
        { every: 5 * 60_000 },
        { name: MOMO_RECONCILE_JOB_ID, data: {}, opts: { removeOnComplete: 20, removeOnFail: 50 } },
      );
      this.logger.log('Rattrapage Mobile Money planifié toutes les 5 minutes.');
    } catch (error) {
      this.logger.warn(`Files Mobile Money non initialisées : ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.verifyWorker?.close().catch(() => undefined);
    await this.reconcileWorker?.close().catch(() => undefined);
    await this.reconcileQueue?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
  }
}
