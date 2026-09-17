import { Injectable } from '@nestjs/common';
import { toJsonAmount } from '../../../shared/money/amount';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { businessToday } from '../../../shared/time/business-date';
import { parseIsoDate, toIsoDate } from '../../leases/domain/calendar';
import {
  ARREARS_BUCKET_LABELS,
  bucketForDaysOverdue,
  daysOverdueAt,
  type ArrearsBucketLabel,
} from '../domain/arrears-buckets';

export interface ArrearsFilters {
  asOf?: string;
  propertyId?: string;
  landlordId?: string;
}

export interface ArrearsDashboardView {
  asOf: string;
  totalAmount: number;
  invoicesCount: number;
  buckets: Array<{ label: ArrearsBucketLabel; amount: number; invoicesCount: number }>;
  topDebtors: Array<{
    tenantId: string;
    displayName: string;
    phone: string;
    amount: number;
    oldestDueDate: string;
    daysOverdue: number;
  }>;
}

/** Ligne brute de `v_unpaid_invoices`, colonnes utiles au tableau des impayés et à l'export CSV. */
export interface UnpaidInvoiceRow {
  invoice_id: string;
  invoice_number: string;
  due_date: Date;
  balance_amount: bigint;
  tenant_id: string;
  tenant_name: string;
  tenant_phone: string;
  property_id: string;
  property_name: string;
  unit_code: string;
  landlord_id: string;
}

const TOP_DEBTORS_LIMIT = 10;

/**
 * Tableau de bord des impayés (`GET /v1/dashboards/arrears`, contrat
 * phase 9). S'appuie sur la vue `v_unpaid_invoices` (partie 14 du DDL) pour
 * le périmètre des factures restant dues et leurs coordonnées de tenant —
 * exactement l'usage annoncé par son commentaire SQL (« socle des relances
 * et du tableau des impayés »).
 *
 * `v_unpaid_invoices.days_overdue` fige `CURRENT_DATE` dans la vue : il n'est
 * PAS repris ici. `asOf` peut différer d'aujourd'hui, et surtout les tests ne
 * doivent jamais dépendre de la date d'exécution — l'ancienneté est donc
 * recalculée en TypeScript à partir de `due_date` et de l'`asOf` demandé
 * (fonctions pures de `domain/arrears-buckets.ts`, testées indépendamment).
 */
@Injectable()
export class ArrearsDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(
    organizationId: string,
    userId: string,
    filters: ArrearsFilters,
  ): Promise<ArrearsDashboardView> {
    const asOf = filters.asOf ? parseIsoDate(filters.asOf) : businessToday();
    const asOfIso = toIsoDate(asOf);

    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      this.unpaidInvoiceRows(tx, organizationId, asOfIso, filters.propertyId, filters.landlordId),
    );

    const buckets = new Map<ArrearsBucketLabel, { amount: bigint; count: number }>(
      ARREARS_BUCKET_LABELS.map((label) => [label, { amount: 0n, count: 0 }]),
    );
    let totalAmount = 0n;
    const byTenant = new Map<
      string,
      { name: string; phone: string; amount: bigint; oldestDueDate: Date }
    >();

    for (const row of rows) {
      const days = daysOverdueAt(row.due_date, asOf);
      const bucket = buckets.get(bucketForDaysOverdue(days))!;
      bucket.amount += row.balance_amount;
      bucket.count += 1;
      totalAmount += row.balance_amount;

      const existing = byTenant.get(row.tenant_id);
      if (!existing) {
        byTenant.set(row.tenant_id, {
          name: row.tenant_name,
          phone: row.tenant_phone,
          amount: row.balance_amount,
          oldestDueDate: row.due_date,
        });
      } else {
        existing.amount += row.balance_amount;
        if (row.due_date.getTime() < existing.oldestDueDate.getTime()) {
          existing.oldestDueDate = row.due_date;
        }
      }
    }

    const topDebtors = [...byTenant.entries()]
      .map(([tenantId, debtor]) => ({
        tenantId,
        displayName: debtor.name,
        phone: debtor.phone,
        amount: toJsonAmount(debtor.amount),
        oldestDueDate: toIsoDate(debtor.oldestDueDate),
        daysOverdue: daysOverdueAt(debtor.oldestDueDate, asOf),
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue || b.amount - a.amount)
      .slice(0, TOP_DEBTORS_LIMIT);

    return {
      asOf: asOfIso,
      totalAmount: toJsonAmount(totalAmount),
      invoicesCount: rows.length,
      buckets: ARREARS_BUCKET_LABELS.map((label) => ({
        label,
        amount: toJsonAmount(buckets.get(label)!.amount),
        invoicesCount: buckets.get(label)!.count,
      })),
      topDebtors,
    };
  }

  /**
   * Lignes brutes des factures restant dues à `asOf`, filtrées par immeuble
   * et bailleur. Exposé pour l'export CSV `arrears`, qui partage exactement
   * ce périmètre (contrat, § « Exports » : « le corps reprend les mêmes
   * filtres que la liste correspondante »).
   */
  async unpaidInvoiceRows(
    tx: TenantClient,
    organizationId: string,
    asOfIso: string,
    propertyId?: string,
    landlordId?: string,
  ): Promise<UnpaidInvoiceRow[]> {
    return tx.$queryRawUnsafe<UnpaidInvoiceRow[]>(
      `SELECT invoice_id, invoice_number, due_date, balance_amount, tenant_id, tenant_name,
              tenant_phone, property_id, property_name, unit_code, landlord_id
         FROM v_unpaid_invoices
        WHERE organization_id = $1::uuid
          AND due_date <= $2::date
          AND ($3::uuid IS NULL OR property_id = $3::uuid)
          AND ($4::uuid IS NULL OR landlord_id = $4::uuid)
        ORDER BY due_date ASC`,
      organizationId,
      asOfIso,
      propertyId ?? null,
      landlordId ?? null,
    );
  }
}
