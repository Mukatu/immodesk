import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import type Redis from 'ioredis';
import { AppConfigService } from '../../../shared/config/config.module';
import { createBullConnection } from '../../../shared/queue/bull-connection';

/**
 * File dédiée à la ré-interrogation des paiements d'abonnement — DISTINCTE
 * de `momo-verify-status` (module `mobile-money`, loyers) : cette dernière
 * n'agit que sur `payments`/`rent_invoices` et ignorerait silencieusement une
 * transaction sans `payment_id`, comme le sont toutes celles d'un abonnement.
 * Même mécanique que `MomoVerifyQueue` : Redis indisponible = file inactive,
 * sans empêcher l'API de servir.
 */
export const SUBSCRIPTION_MOMO_VERIFY_QUEUE = 'subscription-momo-verify';

export interface SubscriptionVerifyJobData {
  organizationId: string;
  transactionId: string;
}

@Injectable()
export class SubscriptionMomoVerifyQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SubscriptionMomoVerifyQueue.name);
  private queue: Queue<SubscriptionVerifyJobData> | null = null;
  private connection: Redis | null = null;

  constructor(private readonly config: AppConfigService) {}

  onModuleInit(): void {
    try {
      this.connection = createBullConnection(this.config.get('REDIS_URL'));
      this.queue = new Queue(SUBSCRIPTION_MOMO_VERIFY_QUEUE, {
        connection: this.connection,
        prefix: this.config.get('QUEUE_PREFIX'),
      });
    } catch (error) {
      this.logger.warn(
        `File ${SUBSCRIPTION_MOMO_VERIFY_QUEUE} non initialisée : ${(error as Error).message}`,
      );
    }
  }

  async enqueue(data: SubscriptionVerifyJobData, options?: { delay?: number }): Promise<void> {
    if (!this.queue) return;
    await this.queue.add('verify', data, {
      jobId: `subscription-momo-verify-${data.transactionId}-${Date.now()}`,
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
