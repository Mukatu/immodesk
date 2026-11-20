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
import { isCheckThrottled, type CheckOrigin } from '../domain/reconcile-rules';
import { MobileMoneyProviderRegistry } from '../infrastructure/mobile-money-provider.registry';
import { OpenPayApiLimiter } from '../infrastructure/openpay.client';

export interface CheckableTransaction {
  id: string;
  organization_id: string;
  amount: bigint;
  currency: string;
  payer_msisdn: string;
  external_reference: string | null;
  aggregator_transaction_id: string | null;
}

/** Statuts d'une transaction agrégateur qu'une vérification peut encore concerner (EXPIRED : alerte d'un succès tardif). */
export const CHECKABLE_STATUSES: readonly string[] = ['INITIATED', 'PENDING', 'EXPIRED'];

/**
 * Point UNIQUE par lequel une transaction agrégateur est re-interrogée (loyer,
 * abonnement, reversement) : construit l'attendu depuis la base, applique
 * l'anti-abus des fournisseurs à webhook non signé, et rattache les
 * évènements reçus à l'organisation SEULEMENT quand la réponse du fournisseur
 * correspond exactement à la transaction.
 *
 * Deux temps, volontairement séparés :
 * - `claim` : réserve la tentative (anti-abus, compteur) dans sa PROPRE transaction courte,
 *   AVANT d'ouvrir celle qui verrouille la ligne : une tentative est comptée même si l'appel
 *   au fournisseur échoue ensuite (la transaction appelante est alors annulée) ;
 * - `check` : l'interrogation elle-même.
 */
@Injectable()
export class MomoStatusChecker {
  private readonly logger = new Logger(MomoStatusChecker.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly registry: MobileMoneyProviderRegistry,
    private readonly limiter: OpenPayApiLimiter,
  ) {}

  /**
   * Réserve une vérification. `false` : limitée (anti-abus), à ne pas effectuer. Sans effet
   * (`true`) pour une ligne qui n'est pas vérifiable (l'appelant s'arrête de lui-même). Compte
   * la tentative (`status_check_count`, `status_checked_at`).
   * - fournisseur à webhook non signé : intervalle minimal pour tout `origin` sauf `RECONCILE`
   *   (rattrapage interne, déjà espacé, jamais freiné), et plafond par heure glissante pour
   *   les seules vérifications déclenchées par callback ;
   * - autres fournisseurs : aucun frein.
   */
  async claim(
    organizationId: string,
    transactionId: string,
    origin: CheckOrigin,
  ): Promise<boolean> {
    return this.prisma.withTenant(organizationId, null, async (tx) => {
      const rows = await tx.$queryRawUnsafe<
        Array<{ aggregator: string | null; status: string; status_checked_at: Date | null }>
      >(
        `SELECT aggregator, status::text AS status, status_checked_at
           FROM mobile_money_transactions
          WHERE id = $1::uuid AND channel = 'AGGREGATOR' FOR UPDATE`,
        transactionId,
      );
      const row = rows[0];
      if (!row || !CHECKABLE_STATUSES.includes(row.status)) return true;
      const provider = this.registry.forCode(row.aggregator ?? 'SIMULATOR');
      if (provider.webhookTrust === 'UNSIGNED_TRIGGER' && origin !== 'RECONCILE') {
        const throttled = isCheckThrottled(
          row,
          { minIntervalSeconds: this.config.get('OPENPAY_MIN_CHECK_INTERVAL_SECONDS') },
          new Date(),
        );
        if (
          throttled ||
          (origin === 'CALLBACK' && !(await this.limiter.tryAcquireCallbackCheck(transactionId)))
        ) {
          this.logger.warn(
            `MOMO.VERIFY_THROTTLED transaction=${transactionId} origin=${origin} ${throttled ? 'intervalle' : 'plafond callbacks'}`,
          );
          return false;
        }
      }
      await tx.$executeRawUnsafe(
        `UPDATE mobile_money_transactions
            SET status_checked_at = now(), status_check_count = LEAST(status_check_count + 1, 32767)
          WHERE id = $1::uuid`,
        transactionId,
      );
      return true;
    });
  }

  /**
   * `null` : aucune interrogation (référence fournisseur inconnue). `tx` : transaction de
   * l'appelant (qui détient le verrou de la ligne) ; `null` pour un appel hors transaction
   * (reversement), où seul le rattachement des évènements est fait.
   */
  async check(
    tx: TenantClient | null,
    provider: MobileMoneyProvider,
    row: CheckableTransaction,
    kind: 'COLLECTION' | 'PAYOUT',
    hint?: { providerReference?: string },
  ): Promise<ProviderStatus | null> {
    const untrusted = provider.webhookTrust === 'UNSIGNED_TRIGGER';
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
      if (tx && kind === 'COLLECTION' && !row.aggregator_transaction_id) {
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
