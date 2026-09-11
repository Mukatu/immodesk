import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import type Redis from 'ioredis';
import { AppConfigService } from '../../../shared/config/config.module';
import { newId } from '../../../shared/ids/uuid';
import { createBullConnection } from '../../../shared/queue/bull-connection';
import { NotificationDeliveryService } from '../application/notification-delivery.service';
import type { DeliveryChannel } from '../domain/delivery-rules';

export const NOTIFICATIONS_QUEUE = 'notifications';

export interface NotificationJob {
  organizationId: string;
  notificationId: string;
  /** Reprise à partir d'un canal (repli après webhook, relance manuelle). */
  from?: DeliveryChannel | null;
}

/**
 * File BullMQ `notifications`. L'envoi n'est jamais un appel synchrone dans
 * la requête HTTP (architecture, § 9.3) : une Cloud API lente ou une
 * passerelle Android hors réseau ne retardent aucune réponse. Sans Redis, le
 * traitement se fait dans le processus, après la réponse.
 */
@Injectable()
export class NotificationsWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsWorker.name);
  private queue: Queue<NotificationJob> | null = null;
  private worker: Worker<NotificationJob> | null = null;
  private connection: Redis | null = null;
  private readonly local = new Set<Promise<unknown>>();

  constructor(
    private readonly config: AppConfigService,
    private readonly delivery: NotificationDeliveryService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('NOTIFICATIONS_WORKER_ENABLED')) return;
    const prefix = this.config.get('QUEUE_PREFIX');
    try {
      this.connection = createBullConnection(this.config.get('REDIS_URL'));
      this.queue = new Queue(NOTIFICATIONS_QUEUE, { connection: this.connection, prefix });
      this.worker = new Worker<NotificationJob>(
        NOTIFICATIONS_QUEUE,
        (job) =>
          this.delivery.deliver(
            job.data.organizationId,
            job.data.notificationId,
            job.data.from ?? null,
          ),
        {
          connection: this.connection,
          prefix,
          concurrency: this.config.get('NOTIFICATIONS_WORKER_CONCURRENCY'),
        },
      );
      this.worker.on('failed', (job, error) =>
        this.logger.error(`Notification en échec (job ${job?.id}) : ${error.message}`),
      );
    } catch (error) {
      this.logger.warn(`File des notifications indisponible : ${(error as Error).message}`);
      this.queue = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([...this.local]);
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
  }

  /** Met la notification en file ; renvoie l'identifiant du travail. */
  async dispatch(job: NotificationJob): Promise<string> {
    const jobId = `${job.notificationId}-${job.from ?? 'start'}-${newId().slice(-8)}`;
    if (this.queue) {
      try {
        await this.queue.add(NOTIFICATIONS_QUEUE, job, {
          jobId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 60_000 },
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 86_400, count: 1000 },
        });
        return jobId;
      } catch (error) {
        this.logger.warn(`Mise en file impossible, envoi local : ${(error as Error).message}`);
      }
    }
    const task = this.delivery
      .deliver(job.organizationId, job.notificationId, job.from ?? null)
      .catch((error: Error) =>
        this.logger.error(`Notification ${job.notificationId} en échec : ${error.message}`),
      )
      .finally(() => this.local.delete(task));
    this.local.add(task);
    return jobId;
  }
}
