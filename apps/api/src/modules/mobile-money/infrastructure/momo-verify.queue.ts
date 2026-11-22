import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import type Redis from 'ioredis';
import { AppConfigService } from '../../../shared/config/config.module';
import { createBullConnection } from '../../../shared/queue/bull-connection';
import type { CheckOrigin } from '../domain/reconcile-rules';

/** BullMQ interdit `:` dans un nom de file ; `momo:verify-status` (contrat) en reste le nom métier documenté. */
export const MOMO_VERIFY_QUEUE_NAME = 'momo-verify-status';

export interface VerifyStatusJobData {
  organizationId: string;
  transactionId: string;
  /** Référence fournisseur reçue dans un callback, avant d'être stockée : candidate, prouvée par `getStatus`. */
  providerReferenceHint?: string;
  /**
   * Ce qui a déclenché la vérification (budget et freins appliqués par `MomoStatusChecker`) :
   * `CALLBACK` si absent (jobs antérieurs), `REFRESH` pour une vérification interne de suivi
   * (relecture 4 s après l'initiation, route manuelle), `RECONCILE` pour une action de reprise.
   */
  origin?: CheckOrigin;
  /** Remises en file successives d'un callback freiné par l'intervalle minimal (borné). */
  requeues?: number;
}

/** Nombre maximal de remises en file d'un callback freiné (au-delà : le rattrapage prend le relais). */
export const MAX_THROTTLE_REQUEUES = 3;

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
      // En production, une file absente rendrait les webhooks muets : on échoue au démarrage.
      if (this.config.isProduction) throw error;
      this.logger.warn(
        `File ${MOMO_VERIFY_QUEUE_NAME} non initialisée : ${(error as Error).message}`,
      );
    }
  }

  async enqueue(data: VerifyStatusJobData, options?: { delay?: number }): Promise<void> {
    if (!this.queue) {
      // En production : erreur visible (l'appelant marque l'événement pour
      // retraitement). Hors production (dev sans Redis) : message, sans bloquer.
      if (this.config.isProduction) {
        throw new Error(`File ${MOMO_VERIFY_QUEUE_NAME} non initialisée : enqueue impossible`);
      }
      this.logger.warn(`File ${MOMO_VERIFY_QUEUE_NAME} absente : job ignoré (hors production)`);
      return;
    }
    await this.queue.add('verify', data, {
      // Déterministe : les déclenchements multiples (callbacks répétés, forgés,
      // rattrapage) d'une même transaction fusionnent tant qu'un job est en
      // attente ou actif. BullMQ interdit « : » dans un jobId : `verify-<txId>`.
      // Les jobs terminés sont supprimés, sinon le jobId bloquerait les suivants.
      jobId: `verify-${data.transactionId}`,
      delay: options?.delay ?? 0,
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  /**
   * Remet en file un callback freiné par l'intervalle minimal, avec un délai égal au reste de
   * l'intervalle : il n'est pas perdu (le polling du client peut être arrêté). Identifiant propre
   * (`verify-retry-`) : le job en cours porte encore `verify-<id>` et ferait ignorer un `add`.
   */
  async requeueThrottled(data: VerifyStatusJobData, delayMs: number): Promise<void> {
    const requeues = (data.requeues ?? 0) + 1;
    if (!this.queue || requeues > MAX_THROTTLE_REQUEUES) return;
    await this.queue.add(
      'verify',
      { ...data, requeues },
      {
        // Suffixé par le rang de la remise en file : le job qui la demande porte peut-être encore
        // `verify-retry-<id>` (actif), et BullMQ ignore silencieusement un `add` au jobId existant.
        jobId: `verify-retry-${data.transactionId}-${requeues}`,
        delay: Math.max(delayMs, 0) + 250,
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
  }
}
