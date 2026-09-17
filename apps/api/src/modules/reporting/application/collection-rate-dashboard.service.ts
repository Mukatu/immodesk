import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { toJsonAmount } from '../../../shared/money/amount';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { businessToday } from '../../../shared/time/business-date';
import {
  addMonths,
  endOfMonth,
  parseIsoDate,
  startOfMonth,
  toIsoDate,
} from '../../leases/domain/calendar';
import { toBps } from '../domain/bps';

export interface CollectionRateFilters {
  from?: string;
  to?: string;
  propertyId?: string;
  landlordId?: string;
}

export interface CollectionRateDashboardView {
  from: string;
  to: string;
  dueAmount: number;
  collectedAmount: number;
  outstandingAmount: number;
  collectionRateBps: number;
  series: Array<{
    period: string;
    dueAmount: number;
    collectedAmount: number;
    collectionRateBps: number;
  }>;
  byProperty: Array<{
    propertyId: string;
    name: string;
    dueAmount: number;
    collectedAmount: number;
    collectionRateBps: number;
  }>;
}

interface MonthRow {
  period: Date;
  due: bigint;
  collected: bigint;
}

interface PropertyRow {
  property_id: string;
  name: string;
  due: bigint;
  collected: bigint;
}

/**
 * Tableau de bord du recouvrement (`GET /v1/dashboards/collection-rate`,
 * contrat phase 9). Périmètre : factures émises dont la période DÉBUTE dans
 * `[from, to]` (brouillons et annulées exclues) — même convention que
 * `BillingDashboardService.monthly`, dont ce tableau généralise le calcul à
 * une période arbitraire (et non un seul mois) filtrable par immeuble ET
 * bailleur, ce que ce service historique ne permet pas.
 */
@Injectable()
export class CollectionRateDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(
    organizationId: string,
    userId: string,
    filters: CollectionRateFilters,
  ): Promise<CollectionRateDashboardView> {
    const { from, to } = resolveRange(filters.from, filters.to);
    const fromIso = toIsoDate(from);
    const toIso = toIsoDate(to);

    const { months, properties } = await this.prisma.withTenant(
      organizationId,
      userId,
      async (tx) => ({
        months: await tx.$queryRawUnsafe<MonthRow[]>(
          `SELECT date_trunc('month', ri.period_start)::date AS period,
                  sum(ri.total_amount)::bigint AS due,
                  sum(ri.paid_amount)::bigint AS collected
             FROM rent_invoices ri
            WHERE ri.period_start BETWEEN $1::date AND $2::date
              AND ri.status NOT IN ('DRAFT', 'CANCELLED')
              AND ($3::uuid IS NULL OR ri.property_id = $3::uuid)
              AND ($4::uuid IS NULL OR ri.landlord_id = $4::uuid)
            GROUP BY 1
            ORDER BY 1`,
          fromIso,
          toIso,
          filters.propertyId ?? null,
          filters.landlordId ?? null,
        ),
        properties: await tx.$queryRawUnsafe<PropertyRow[]>(
          `SELECT ri.property_id, p.name,
                  sum(ri.total_amount)::bigint AS due,
                  sum(ri.paid_amount)::bigint AS collected
             FROM rent_invoices ri
             JOIN properties p ON p.id = ri.property_id
            WHERE ri.period_start BETWEEN $1::date AND $2::date
              AND ri.status NOT IN ('DRAFT', 'CANCELLED')
              AND ($3::uuid IS NULL OR ri.property_id = $3::uuid)
              AND ($4::uuid IS NULL OR ri.landlord_id = $4::uuid)
            GROUP BY ri.property_id, p.name
            ORDER BY p.name`,
          fromIso,
          toIso,
          filters.propertyId ?? null,
          filters.landlordId ?? null,
        ),
      }),
    );

    const dueAmount = months.reduce((sum, m) => sum + m.due, 0n);
    const collectedAmount = months.reduce((sum, m) => sum + m.collected, 0n);

    return {
      from: fromIso,
      to: toIso,
      dueAmount: toJsonAmount(dueAmount),
      collectedAmount: toJsonAmount(collectedAmount),
      outstandingAmount: toJsonAmount(dueAmount - collectedAmount),
      collectionRateBps: toBps(collectedAmount, dueAmount),
      series: months.map((m) => ({
        period: toIsoDate(m.period).slice(0, 7),
        dueAmount: toJsonAmount(m.due),
        collectedAmount: toJsonAmount(m.collected),
        collectionRateBps: toBps(m.collected, m.due),
      })),
      byProperty: properties.map((p) => ({
        propertyId: p.property_id,
        name: p.name,
        dueAmount: toJsonAmount(p.due),
        collectedAmount: toJsonAmount(p.collected),
        collectionRateBps: toBps(p.collected, p.due),
      })),
    };
  }
}

/**
 * Plage résolue : par défaut, les six derniers mois glissants jusqu'au mois
 * courant (heure métier de Brazzaville) — assez pour une série mensuelle
 * lisible sans paramètre, sans jamais figer une valeur dans le domaine pur.
 */
export function resolveRange(from?: string, to?: string): { from: Date; to: Date } {
  const today = businessToday();
  const toDate = to ? parseIsoDate(to) : endOfMonth(today);
  const fromDate = from ? parseIsoDate(from) : startOfMonth(addMonths(today, -5));
  if (fromDate.getTime() > toDate.getTime()) {
    throw new DomainError('REPORTING.INVALID_PERIOD', { from, to });
  }
  return { from: fromDate, to: toDate };
}
