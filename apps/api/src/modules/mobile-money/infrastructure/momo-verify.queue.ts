import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import type Redis from 'ioredis';
import { AppConfigService } from '../../../shared/config/config.module';
import { createBullConnection } from '../../../shared/queue/bull-connection';

/** BullMQ interdit `:` dans un nom de file ; `momo:verify-status` (contrat) en reste le nom métier documenté. */
export const MOMO_VERIFY_QUEUE_NAME = 'momo-verify-status';

export interface VerifyStatusJobData {
  organizationId: string;
  transactionId: string;
}

/**
 * Producteur de la file `momo:verify-status` (contrat phase 4, § « Webhook »
 * et § « Confirmation »). Séparé du worker (`MomoJobsService`) : l'agrégateur
 * enfile un job sans dépendre du composant qui le consomme, ce qui évite un
 * cycle d'injection entre les deux services applicatifs.
 */
@Injectable()
export class MomoVerifyQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MomoVerifyQueue.name);
  private queue: Queue<VerifyStatusJobData> | null = null;
  private connection: Redis | null = null;

  constructor(private readonly config: AppConfigService) {}

  onModuleInit(): void {
    try {
      this.connection = createBullConnection(this.config.get('REDIS_URL'));
      this.queue = new Queue(MOMO_VERIFY_QUEUE_NAME, {
        connection: this.connection,
        prefix: this.config.get('QUEUE_PREFIX'),
      });
    } catch (error) {
      this.logger.warn(
        `File ${MOMO_VERIFY_QUEUE_NAME} non initialisée : ${(error as Error).message}`,
      );
    }
  }

  async enqueue(data: VerifyStatusJobData, options?: { delay?: number }): Promise<void> {
    if (!this.queue) return;
    await this.queue.add('verify', data, {
      jobId: `momo-verify-${data.transactionId}-${Date.now()}`,
      delay: options?.delay ?? 0,
      attempts: 1,
      removeOnComplete: 200,
      removeOnFail: 200,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
  }
}
