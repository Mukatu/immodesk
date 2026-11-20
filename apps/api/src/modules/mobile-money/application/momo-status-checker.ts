import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { providerReferenceOf } from '../domain/momo-rules';
import type {
  MobileMoneyProvider,
  ProviderStatus,
  ProviderStatusExpectation,
} from '../domain/ports';
import { isCheckThrottled } from '../domain/reconcile-rules';

export interface CheckableTransaction {
  id: string;
  organization_id: string;
  amount: bigint;
  currency: string;
  payer_msisdn: string;
  external_reference: string | null;
  aggregator_transaction_id: string | null;
  status_checked_at: Date | null;
  status_check_count: number;
}

/**
 * Point UNIQUE par lequel une transaction agrégateur est re-interrogée (loyer,
 * abonnement, reversement) : construit l'attendu depuis la base, applique
 * l'anti-abus des fournisseurs à webhook non signé, et rattache les
 * évènements reçus à l'organisation SEULEMENT quand la réponse du fournisseur
 * correspond exactement à la transaction.
 */
@Injectable()
export class MomoStatusChecker {
  private readonly logger = new Logger(MomoStatusChecker.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /** `null` : aucune interrogation (limitée, ou référence fournisseur inconnue). */
  async check(
    tx: TenantClient,
    provider: MobileMoneyProvider,
    row: CheckableTransaction,
    kind: 'COLLECTION' | 'PAYOUT',
    hint?: { providerReference?: string },
  ): Promise<ProviderStatus | null> {
    const untrusted = provider.webhookTrust === 'UNSIGNED_TRIGGER';
    if (
      untrusted &&
      isCheckThrottled(
        row,
        {
          minIntervalSeconds: this.config.get('OPENPAY_MIN_CHECK_INTERVAL_SECONDS'),
          maxChecks: this.config.get('OPENPAY_MAX_CHECKS_PER_TRANSACTION'),
        },
        new Date(),
      )
    ) {
      this.logger.warn(
        `MOMO.VERIFY_THROTTLED transaction=${row.id} checks=${row.status_check_count}`,
      );
      return null;
    }
    // Collecte OpenPay : la référence est celle du fournisseur (PTXN...). Si elle n'est pas
    // encore stockée, seule celle du callback peut servir, et la metadata la prouvera.
    const candidate =
      untrusted && kind === 'COLLECTION' && !row.aggregator_transaction_id
        ? (hint?.providerReference ?? null)
        : providerReferenceOf(row);
    if (!candidate || !row.external_reference) {
      this.logger.warn(
        `MOMO.VERIFY_SKIPPED transaction=${row.id} : référence fournisseur inconnue`,
      );
      return null;
    }
    const expected: ProviderStatusExpectation = {
      kind,
      externalReference: row.external_reference,
      amount: row.amount,
      currency: row.currency,
      msisdn: row.payer_msisdn,
    };
    const status = await provider.getStatus(candidate, expected);
    if (untrusted && status.matched === true) {
      if (kind === 'COLLECTION' && !row.aggregator_transaction_id) {
        await tx.mobile_money_transactions.updateMany({
          where: { id: row.id, aggregator_transaction_id: null },
          data: { aggregator_transaction_id: candidate },
        });
      }
      await this.claimTriggerEvents(row.organization_id, row.id);
    }
    return status;
  }

  /** Les évènements de déclenchement de cette transaction deviennent visibles de son organisation. */
  async claimTriggerEvents(organizationId: string, transactionId: string): Promise<void> {
    const admin = this.prisma.adminClient();
    if (!admin) {
      throw new DomainError('PLATFORM.INTERNAL_ERROR', { reason: 'DATABASE_ADMIN_URL absent' });
    }
    await admin.$executeRawUnsafe(
      `UPDATE webhook_events
          SET organization_id = $1::uuid, updated_at = now()
        WHERE source = 'OPENPAY' AND organization_id IS NULL AND related_entity_id = $2::uuid`,
      organizationId,
      transactionId,
    );
  }
}
