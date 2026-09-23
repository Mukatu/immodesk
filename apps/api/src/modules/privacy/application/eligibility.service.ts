import { Injectable } from '@nestjs/common';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import {
  evaluateEligibility,
  type EligibilityFacts,
  type EligibilityVerdict,
} from '../domain/eligibility';
import type { SubjectType } from '../domain/subject';

interface LeaseFactsRow {
  has_active_or_notice: boolean;
  has_non_zero_balance: boolean;
  last_closed_at: Date | null;
}

/**
 * Rassemble les FAITS de recevabilité d'un effacement (contrat, § « Effacement »,
 * lignes 94-96) par une lecture SQL, puis délègue le verdict au domaine pur
 * (`domain/eligibility.ts`). Un seul aller-retour par sujet : trois requêtes
 * au plus (baux, dépôt, bailleur self), toutes sous RLS (`tx` déjà ouvert).
 */
@Injectable()
export class EligibilityService {
  async evaluate(
    tx: TenantClient,
    subjectType: SubjectType,
    subjectId: string,
    identityMonths: number,
    now: Date = new Date(),
  ): Promise<EligibilityVerdict> {
    const facts = await this.gatherFacts(tx, subjectType, subjectId);
    return evaluateEligibility(facts, identityMonths, now);
  }

  private async gatherFacts(
    tx: TenantClient,
    subjectType: SubjectType,
    subjectId: string,
  ): Promise<EligibilityFacts> {
    if (subjectType === 'user') {
      // L'effacement d'organisation ne concerne jamais `users` (arbitrage 9) :
      // aucun appel n'atteint ce chemin (`partyTableFor('user') === null`
      // est vérifié en amont par le service applicatif).
      return {
        isSelfLandlord: false,
        hasActiveOrNoticeLease: false,
        hasNonZeroBalance: false,
        hasHeldDeposit: false,
        lastLeaseClosedAt: null,
      };
    }

    const leaseFilter = leaseJoinFor(subjectType);
    const [leaseRows, depositRows, selfRows] = await Promise.all([
      tx.$queryRawUnsafe<LeaseFactsRow[]>(
        `SELECT
            bool_or(l.status IN ('ACTIVE', 'NOTICE_GIVEN')) AS has_active_or_notice,
            bool_or(l.status NOT IN ('ACTIVE', 'NOTICE_GIVEN') AND l.balance_amount <> 0) AS has_non_zero_balance,
            max(coalesce(l.terminated_at::date, l.move_out_date, l.end_date)) FILTER (
              WHERE l.status IN ('TERMINATED', 'EXPIRED', 'CANCELLED')
            ) AS last_closed_at
          FROM leases l
          ${leaseFilter.join}
         WHERE l.deleted_at IS NULL AND ${leaseFilter.where}`,
        subjectId,
      ),
      subjectType === 'tenant'
        ? tx.$queryRawUnsafe<{ held: boolean }[]>(
            `SELECT bool_or(d.status NOT IN ('REFUNDED', 'FORFEITED')) AS held
               FROM deposits d WHERE d.tenant_id = $1::uuid`,
            subjectId,
          )
        : Promise.resolve([{ held: false }]),
      subjectType === 'landlord'
        ? tx.$queryRawUnsafe<{ is_self: boolean }[]>(
            `SELECT is_self FROM landlords WHERE id = $1::uuid`,
            subjectId,
          )
        : Promise.resolve([{ is_self: false }]),
    ]);

    const lease = leaseRows[0];
    return {
      isSelfLandlord: selfRows[0]?.is_self ?? false,
      hasActiveOrNoticeLease: lease?.has_active_or_notice ?? false,
      // Le solde n'a de sens que pour le locataire, seul porteur de `balance_amount` exploitable ici.
      hasNonZeroBalance: subjectType === 'tenant' ? (lease?.has_non_zero_balance ?? false) : false,
      hasHeldDeposit: depositRows[0]?.held ?? false,
      lastLeaseClosedAt: lease?.last_closed_at ?? null,
    };
  }
}

function leaseJoinFor(subjectType: SubjectType): { join: string; where: string } {
  switch (subjectType) {
    case 'tenant':
      return {
        join: `LEFT JOIN lease_parties lp ON lp.lease_id = l.id AND lp.tenant_id = $1::uuid`,
        where: `(l.primary_tenant_id = $1::uuid OR lp.tenant_id = $1::uuid)`,
      };
    case 'landlord':
      return { join: '', where: `l.landlord_id = $1::uuid` };
    case 'guarantor':
      return {
        join: `JOIN lease_parties lp ON lp.lease_id = l.id`,
        where: `lp.guarantor_id = $1::uuid`,
      };
    case 'user':
      return { join: '', where: 'false' };
  }
}
