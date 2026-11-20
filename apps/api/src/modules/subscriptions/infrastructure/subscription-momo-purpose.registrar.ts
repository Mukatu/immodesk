import { Injectable, type OnModuleInit } from '@nestjs/common';
import { MomoPurposeRouter } from '../../mobile-money/application/momo-purpose-router';
import { SubscriptionPaymentsService } from '../application/subscription-payments.service';
import { SubscriptionMomoVerifyQueue } from './subscription-momo-verify.queue';

/**
 * Inscrit le traitement des transactions `SUBSCRIPTION` auprès du routeur de
 * `mobile-money` : `subscriptions` dépend de `mobile-money`, jamais l'inverse.
 */
@Injectable()
export class SubscriptionMomoPurposeRegistrar implements OnModuleInit {
  constructor(
    private readonly router: MomoPurposeRouter,
    private readonly queue: SubscriptionMomoVerifyQueue,
    private readonly payments: SubscriptionPaymentsService,
  ) {}

  onModuleInit(): void {
    this.router.register('SUBSCRIPTION', {
      enqueueVerify: (organizationId, transactionId, hint) =>
        this.queue.enqueue({
          organizationId,
          transactionId,
          ...(hint?.providerReference ? { providerReferenceHint: hint.providerReference } : {}),
        }),
      verifyNow: (organizationId, transactionId, hint) =>
        this.payments.verifyStatus(organizationId, transactionId, hint),
    });
  }
}
