import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { toJsonAmount } from '../../../shared/money/amount';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { businessToday, monthBounds } from '../../../shared/time/business-date';
import { toIsoDate } from '../../leases/domain/calendar';

export const PAYMENT_METHODS = ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'BANK_CHECK'] as const;

export interface BillingDashboardView {
  period: string;
  expectedAmount: number;
  collectedAmount: number;
  outstandingAmount: number;
  overdueAmount: number;
  invoicesCount: number;
  paidCount: number;
  byProperty: Array<{
    propertyId: string;
    name: string;
    expected: number;
    collected: number;
    outstanding: number;
  }>;
  byMethod: Record<(typeof PAYMENT_METHODS)[number], number>;
}

interface PropertyRow {
  property_id: string;
  name: string;
  expected: bigint;
  collected: bigint;
  outstanding: bigint;
  overdue: bigint;
  invoices: bigint;
  paid: bigint;
}

/**
 * Tableau de bord mensuel : attendu, encaissé, reste à encaisser, par
 * immeuble et par mode de règlement. Périmètre : factures émises dont la
 * période DÉBUTE dans le mois (brouillons et annulées exclus).
 *
 * `byMethod` additionne les imputations nettes de contre-passation sur ces
 * factures, et non les paiements reçus dans le mois : c'est ce qui rend la
 * somme par mode égale à `collectedAmount`.
 */
@Injectable()
export class BillingDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async monthly(
    organizationId: string,
    userId: string,
    period?: string,
  ): Promise<BillingDashboardView> {
    const resolved = period ?? toIsoDate(businessToday()).slice(0, 7);
    const bounds = monthBounds(resolved);
    if (!bounds)
      throw new DomainError('VALIDATION.INVALID_PAYLOAD', { period: 'YYYY-MM attendu.' });
    const from = toIsoDate(bounds.start);
    const to = toIsoDate(bounds.end);

    const { properties, methods } = await this.prisma.withTenant(
      organizationId,
      userId,
      async (tx) => ({
        properties: await tx.$queryRawUnsafe<PropertyRow[]>(
          `SELECT ri.property_id, p.name,
                sum(ri.total_amount)::bigint AS expected,
                sum(ri.paid_amount)::bigint AS collected,
                sum(ri.balance_amount)::bigint AS outstanding,
                sum(CASE WHEN ri.status = 'OVERDUE' THEN ri.balance_amount ELSE 0 END)::bigint AS overdue,
                count(*)::bigint AS invoices,
                count(*) FILTER (WHERE ri.status = 'PAID')::bigint AS paid
           FROM rent_invoices ri
           JOIN properties p ON p.id = ri.property_id
          WHERE ri.period_start BETWEEN $1::date AND $2::date
            AND ri.status NOT IN ('DRAFT', 'CANCELLED')
          GROUP BY ri.property_id, p.name
          ORDER BY p.name`,
          from,
          to,
        ),
        methods: await tx.$queryRawUnsafe<Array<{ method: string; collected: bigint }>>(
          `SELECT pm.method::text AS method,
                sum(CASE WHEN pa.is_reversal THEN -pa.amount ELSE pa.amount END)::bigint AS collected
           FROM payment_allocations pa
           JOIN payments pm ON pm.id = pa.payment_id
           JOIN rent_invoices ri ON ri.id = pa.invoice_id
          WHERE ri.period_start BETWEEN $1::date AND $2::date
            AND ri.status NOT IN ('DRAFT', 'CANCELLED')
          GROUP BY pm.method`,
          from,
          to,
        ),
      }),
    );

    const sum = (pick: (row: PropertyRow) => bigint): bigint =>
      properties.reduce((total, row) => total + pick(row), 0n);
    const byMethod = Object.fromEntries(
      PAYMENT_METHODS.map((m) => [m, 0]),
    ) as BillingDashboardView['byMethod'];
    for (const row of methods) {
      if ((PAYMENT_METHODS as readonly string[]).includes(row.method)) {
        byMethod[row.method as (typeof PAYMENT_METHODS)[number]] = toJsonAmount(row.collected);
      }
    }

    return {
      period: resolved,
      expectedAmount: toJsonAmount(sum((r) => r.expected)),
      collectedAmount: toJsonAmount(sum((r) => r.collected)),
      outstandingAmount: toJsonAmount(sum((r) => r.outstanding)),
      overdueAmount: toJsonAmount(sum((r) => r.overdue)),
      invoicesCount: Number(sum((r) => r.invoices)),
      paidCount: Number(sum((r) => r.paid)),
      byProperty: properties.map((row) => ({
        propertyId: row.property_id,
        name: row.name,
        expected: toJsonAmount(row.expected),
        collected: toJsonAmount(row.collected),
        outstanding: toJsonAmount(row.outstanding),
      })),
      byMethod,
    };
  }
}
