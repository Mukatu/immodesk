import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG } from '../../../shared/config/config.module';
import type { AppConfig } from '../../../shared/config/config.schema';
import { decodeCursor, encodeCursor } from '../../../shared/pagination/cursor';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface ReferralView {
  id: string;
  partnerId: string;
  referredOrganizationId: string;
  referredPropertyId: string | null;
  source: string;
  status: string;
  qualifiedAt: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface ReferralCommissionView {
  id: string;
  referralId: string;
  baseAmount: string;
  rateBps: number;
  commissionAmount: string;
  status: string;
  periodMonth: string | null;
  accruedAt: string;
  reversalOfId: string | null;
}

export interface PageInfoView {
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
}

const COMMISSION_STATUSES = ['ACCRUED', 'APPROVED', 'PAID', 'REVERSED', 'CANCELLED'] as const;

// Pagination simplifiée (comme `landlord-portal/application/cross-org-page.ts`) :
// le curseur est une position `(date, id)` comparée par `<=` plutôt qu'un vrai
// keyset composite — un partenaire n'accumule jamais assez de lignes pour que
// la différence soit sensible.

@Injectable()
export class ReferralQueriesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async listReferrals(
    partnerUserId: string,
    partnerId: string,
    options: { limit?: number; cursor?: string },
  ): Promise<{ items: ReferralView[]; pageInfo: PageInfoView }> {
    const limit = clamp(options.limit);
    const position = options.cursor
      ? decodeCursor(options.cursor, this.config.CURSOR_SECRET)
      : null;

    const rows = await this.prisma.withUser(partnerUserId, (tx) =>
      tx.referrals.findMany({
        where: {
          partner_id: partnerId,
          ...(position
            ? { created_at: { lte: new Date(position.createdAt) }, NOT: { id: position.id } }
            : {}),
        },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      }),
    );

    return paginate(rows, limit, position, this.config.CURSOR_SECRET, toReferralView);
  }

  async listCommissions(
    partnerUserId: string,
    partnerId: string,
    options: { limit?: number; cursor?: string },
  ): Promise<{
    items: ReferralCommissionView[];
    pageInfo: PageInfoView;
    totals: Record<(typeof COMMISSION_STATUSES)[number], string>;
  }> {
    const limit = clamp(options.limit);
    const position = options.cursor
      ? decodeCursor(options.cursor, this.config.CURSOR_SECRET)
      : null;

    const [rows, grouped] = await this.prisma.withUser(partnerUserId, (tx) =>
      Promise.all([
        tx.referral_commissions.findMany({
          where: {
            partner_id: partnerId,
            ...(position
              ? { accrued_at: { lte: new Date(position.createdAt) }, NOT: { id: position.id } }
              : {}),
          },
          orderBy: [{ accrued_at: 'desc' }, { id: 'desc' }],
          take: limit + 1,
        }),
        tx.referral_commissions.groupBy({
          by: ['status'],
          where: { partner_id: partnerId },
          _sum: { commission_amount: true },
        }),
      ]),
    );

    const totals = Object.fromEntries(COMMISSION_STATUSES.map((status) => [status, '0'])) as Record<
      (typeof COMMISSION_STATUSES)[number],
      string
    >;
    for (const g of grouped) {
      totals[g.status as (typeof COMMISSION_STATUSES)[number]] = (
        g._sum.commission_amount ?? 0n
      ).toString();
    }

    const page = paginate(
      rows,
      limit,
      position,
      this.config.CURSOR_SECRET,
      toCommissionView,
      'accrued_at',
    );
    return { ...page, totals };
  }
}

function clamp(limit: number | undefined): number {
  const n = limit ?? 20;
  return Math.min(Math.max(n, 1), 100);
}

function paginate<TRow extends { id: string; created_at?: Date; accrued_at?: Date }, TView>(
  rows: TRow[],
  limit: number,
  _position: { createdAt: string; id: string } | null,
  secret: string,
  toView: (row: TRow) => TView,
  dateField: 'created_at' | 'accrued_at' = 'created_at',
): { items: TView[]; pageInfo: PageInfoView } {
  const hasNextPage = rows.length > limit;
  const page = hasNextPage ? rows.slice(0, limit) : rows;
  const last = page.at(-1);
  const lastDate = last
    ? dateField === 'accrued_at'
      ? last.accrued_at
      : last.created_at
    : undefined;
  return {
    items: page.map(toView),
    pageInfo: {
      nextCursor:
        hasNextPage && last && lastDate
          ? encodeCursor({ createdAt: lastDate.toISOString(), id: last.id }, secret)
          : null,
      hasNextPage,
      limit,
    },
  };
}

export function toReferralView(row: {
  id: string;
  partner_id: string;
  referred_organization_id: string;
  referred_property_id: string | null;
  source: string;
  status: string;
  qualified_at: Date | null;
  activated_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
}): ReferralView {
  return {
    id: row.id,
    partnerId: row.partner_id,
    referredOrganizationId: row.referred_organization_id,
    referredPropertyId: row.referred_property_id,
    source: row.source,
    status: row.status,
    qualifiedAt: row.qualified_at?.toISOString() ?? null,
    activatedAt: row.activated_at?.toISOString() ?? null,
    expiresAt: row.expires_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

export function toCommissionView(row: {
  id: string;
  referral_id: string;
  base_amount: bigint;
  rate_bps: number;
  commission_amount: bigint;
  status: string;
  period_month: Date | null;
  accrued_at: Date;
  reversal_of_id: string | null;
}): ReferralCommissionView {
  return {
    id: row.id,
    referralId: row.referral_id,
    baseAmount: row.base_amount.toString(),
    rateBps: row.rate_bps,
    commissionAmount: row.commission_amount.toString(),
    status: row.status,
    periodMonth: row.period_month?.toISOString().slice(0, 10) ?? null,
    accruedAt: row.accrued_at.toISOString(),
    reversalOfId: row.reversal_of_id,
  };
}
