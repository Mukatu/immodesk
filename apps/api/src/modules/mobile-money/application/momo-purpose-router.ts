import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { MOMO_PURPOSES, type MomoPurpose } from '../domain/momo-purpose';
import { MomoVerifyQueue } from '../infrastructure/momo-verify.queue';
import { MomoVerificationService } from './momo-verification.service';

export type { MomoPurpose } from '../domain/momo-purpose';

export interface MomoPurposeHandler {
  /** Webhook ou rejeu : ré-interrogation asynchrone, la réponse reste sous 500 ms. */
  enqueueVerify(organizationId: string, transactionId: string): Promise<void>;
  /** Rattrapage périodique : ré-interrogation immédiate. */
  verifyNow(organizationId: string, transactionId: string): Promise<void>;
}

/**
 * Aiguillage d'une transaction Mobile Money vers SON traitement, selon
 * `mobile_money_transactions.purpose` (webhook, rejeu et rattrapage passent
 * tous par ici : une transaction n'est jamais traitée par le mauvais flux).
 *
 * - `RENT_COLLECTION` : file `momo-verify-status` ; `MomoVerificationService`
 *   (paiement de loyer confirmé et alloué).
 * - `OWNER_PAYOUT` : même file ; `MomoVerificationService` délègue au
 *   décaissement (`MomoPayoutService.refreshPayoutStatus`).
 * - `SUBSCRIPTION` : inscrit au démarrage par `subscriptions`, pour que
 *   `mobile-money` n'importe jamais `subscriptions` (aucun cycle de modules).
 *
 * Ne touche pas la base.
 */
@Injectable()
export class MomoPurposeRouter implements OnApplicationBootstrap {
  private readonly handlers = new Map<MomoPurpose, MomoPurposeHandler>();

  constructor(verifyQueue: MomoVerifyQueue, verification: MomoVerificationService) {
    const viaVerification: MomoPurposeHandler = {
      enqueueVerify: (organizationId, transactionId) =>
        verifyQueue.enqueue({ organizationId, transactionId }),
      verifyNow: (organizationId, transactionId) =>
        verification.verifyStatus(organizationId, transactionId),
    };
    this.handlers.set('RENT_COLLECTION', viaVerification);
    this.handlers.set('OWNER_PAYOUT', viaVerification);
  }

  register(purpose: 'SUBSCRIPTION', handler: MomoPurposeHandler): void {
    if (this.handlers.has(purpose)) {
      throw new Error(`MomoPurposeRouter : traitement déjà inscrit pour ${purpose}`);
    }
    this.handlers.set(purpose, handler);
  }

  /**
   * Au démarrage (après les `onModuleInit` de tous les modules, dont
   * l'inscription de `SUBSCRIPTION`) : un `purpose` sans traitement ferait
   * échouer en silence les webhooks et le rattrapage de ces transactions.
   */
  onApplicationBootstrap(): void {
    this.assertAllPurposesRegistered();
  }

  assertAllPurposesRegistered(): void {
    const missing = MOMO_PURPOSES.filter((purpose) => !this.handlers.has(purpose));
    if (missing.length > 0) {
      throw new Error(
        `MomoPurposeRouter : aucun traitement inscrit pour le(s) purpose ${missing.join(', ')}`,
      );
    }
  }

  handlerFor(purpose: MomoPurpose): MomoPurposeHandler | null {
    return this.handlers.get(purpose) ?? null;
  }
}
