import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { toJsonAmount } from '../../../shared/money/amount';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { readOperationalSettings } from '../../../shared/settings/operational-settings';
import { holdingCap, isOverCap } from '../domain/cash-rules';

interface BalanceRow {
  user_id: string;
  full_name: string | null;
  cash_limit_amount: bigint;
  held_amount: bigint;
  receipts_count: bigint;
  oldest_receipt_at: Date | null;
  last_remittance_at: Date | null;
}

export interface CollectorBalanceView {
  userId: string;
  fullName: string;
  heldAmount: number;
  receiptsCount: number;
  oldestReceiptAt: string | null;
  capAmount: number;
  overCap: boolean;
  lastRemittanceAt: string | null;
}

/**
 * Encours d'espèces par démarcheur : somme des reçus ISSUED (ni remis ni
 * annulés). Un reçu inclus dans une remise SOUMISE reste détenu tant que la
 * remise n'est pas contrôlée — l'argent n'est pas encore compté à l'agence.
 */
@Injectable()
export class CashBalancesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, userId: string): Promise<{ items: CollectorBalanceView[] }> {
    return { items: await this.query(organizationId, userId, null) };
  }

  async one(
    organizationId: string,
    userId: string,
    collectorUserId: string,
  ): Promise<CollectorBalanceView> {
    const [balance] = await this.query(organizationId, userId, collectorUserId);
    if (!balance) throw new DomainError('ORG.MEMBER_NOT_FOUND', { userId: collectorUserId });
    return balance;
  }

  private async query(
    organizationId: string,
    userId: string,
    collectorUserId: string | null,
  ): Promise<CollectorBalanceView[]> {
    const { rows, cap } = await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const settings = await tx.organization_settings.findUnique({
        where: { organization_id: organizationId },
        select: { settings_json: true },
      });
      const rows = await tx.$queryRawUnsafe<BalanceRow[]>(
        `SELECT m.user_id,
                coalesce(u.display_name, nullif(concat_ws(' ', u.first_name, u.last_name), ''), u.phone_e164) AS full_name,
                m.cash_limit_amount,
                coalesce(sum(cr.amount) FILTER (WHERE cr.status = 'ISSUED'), 0)::bigint AS held_amount,
                count(cr.id) FILTER (WHERE cr.status = 'ISSUED')::bigint AS receipts_count,
                min(cr.received_at) FILTER (WHERE cr.status = 'ISSUED') AS oldest_receipt_at,
                (SELECT max(r.submitted_at) FROM cash_remittances r WHERE r.collector_user_id = m.user_id)
                  AS last_remittance_at
           FROM organization_members m
           JOIN users u ON u.id = m.user_id
           LEFT JOIN cash_receipts cr ON cr.collector_user_id = m.user_id
          WHERE m.status = 'ACTIVE'
            AND ($1::uuid IS NULL OR m.user_id = $1::uuid)
            AND (m.role = 'COLLECTOR' OR $1::uuid IS NOT NULL
                 OR EXISTS (SELECT 1 FROM cash_receipts x WHERE x.collector_user_id = m.user_id))
          GROUP BY m.user_id, u.display_name, u.first_name, u.last_name, u.phone_e164, m.cash_limit_amount
          ORDER BY held_amount DESC, full_name`,
        collectorUserId,
      );
      return {
        rows,
        cap: BigInt(
          readOperationalSettings(settings?.settings_json).cash.collectorHoldingCapAmount,
        ),
      };
    });

    return rows.map((row) => {
      const effectiveCap = holdingCap(row.cash_limit_amount, cap);
      return {
        userId: row.user_id,
        fullName: row.full_name ?? '',
        heldAmount: toJsonAmount(row.held_amount),
        receiptsCount: Number(row.receipts_count),
        oldestReceiptAt: row.oldest_receipt_at ? row.oldest_receipt_at.toISOString() : null,
        capAmount: toJsonAmount(effectiveCap),
        overCap: isOverCap(row.held_amount, effectiveCap),
        lastRemittanceAt: row.last_remittance_at ? row.last_remittance_at.toISOString() : null,
      };
    });
  }
}
