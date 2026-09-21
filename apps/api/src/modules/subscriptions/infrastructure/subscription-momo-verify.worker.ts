import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import type Redis from 'ioredis';
import { AppConfigService } from '../../../shared/config/config.module';
import { createBullConnection } from '../../../shared/queue/bull-connection';
import { SubscriptionPaymentsService } from '../application/subscription-payments.service';
import {
  SUBSCRIPTION_MOMO_VERIFY_QUEUE,
  type SubscriptionVerifyJobData,
} from './subscription-momo-verify.queue';

/** Consomme `subscription-momo-verify` (voir la file pour la justification). */
@Injectable()
export class SubscriptionMomoVerifyWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SubscriptionMomoVerifyWorker.name);
  private worker: Worker<SubscriptionVerifyJobData> | null = null;
  private connection: Redis | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly payments: SubscriptionPaymentsService,
  ) {}

  onModuleInit(): void {
    try {
      this.connection = createBullConnection(this.config.get('REDIS_URL'));
      this.worker = new Worker<SubscriptionVerifyJobData>(
        SUBSCRIPTION_MOMO_VERIFY_QUEUE,
        (job) => this.payments.verifyStatus(job.data.organizationId, job.data.transactionId),
        { connection: this.connection, prefix: this.config.get('QUEUE_PREFIX'), concurrency: 4 },
      );
      this.worker.on('failed', (job, error) =>
        this.logger.error(`subscription-momo-verify en échec (job ${job?.id}) : ${error.message}`),
      );
    } catch (error) {
      this.logger.warn(
        `File ${SUBSCRIPTION_MOMO_VERIFY_QUEUE} : worker non démarré : ${(error as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
  }
}
