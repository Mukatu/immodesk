import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { toJsonAmount } from '../../../shared/money/amount';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { businessToday } from '../../../shared/time/business-date';
// Réutilisation DÉLIBÉRÉE : `PAYMENT_METHODS` est la seule source de vérité
// des quatre valeurs de `payment_method` (contrat, § « Encaissements par
// mode »). `BillingDashboardService`, qui calcule déjà une répartition par
// mode, n'est PAS injectable ici : il n'est pas dans les `exports` de
// `BillingModule` (seuls `InvoiceLedgerService`, `InvoiceWriterService`,
// `InvoicesQueryService`, `InvoicesService`, `BillingEngineService` et
// `BillingRunsService` le sont), et le module `billing` lui appartient à un
// autre agent — y ajouter cet export est hors du périmètre confié ici. Sa
// méthode `monthly()` est en outre bornée à UN SEUL mois calendaire et ne
// filtre pas par immeuble, alors que ce tableau de bord prend un intervalle
// `from/to` arbitraire et un `propertyId` optionnel : la reprendre telle
// quelle n'aurait pas convenu. Le calcul ci-dessous mire donc très
// exactement sa requête (imputations nettes de contre-passation par mode,
// jointes aux factures) pour rester cohérent avec `collectedAmount` du
// tableau de recouvrement.
import { PAYMENT_METHODS } from '../../billing/application/billing-dashboard.service';
import { addDays, parseIsoDate, toIsoDate } from '../../leases/domain/calendar';
import { toBps } from '../domain/bps';

export interface PaymentMethodsFilters {
  from?: string;
  to?: string;
  propertyId?: string;
}

export interface PaymentMethodsDashboardView {
  from: string;
  to: string;
  totalAmount: number;
  byMethod: Array<{
    method: (typeof PAYMENT_METHODS)[number];
    amount: number;
    shareBps: number;
    count: number;
  }>;
}

interface MethodRow {
  method: string;
  amount: bigint;
  count: bigint;
}

/**
 * Tableau de bord des encaissements par mode
 * (`GET /v1/dashboards/payment-methods`, contrat phase 9), qui « mesure la
 * bancarisation progressive » de la clientèle.
 */
@Injectable()
export class PaymentMethodsDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(
    organizationId: string,
    userId: string,
    filters: PaymentMethodsFilters,
  ): Promise<PaymentMethodsDashboardView> {
    const today = businessToday();
    const to = filters.to ? parseIsoDate(filters.to) : today;
    const from = filters.from ? parseIsoDate(filters.from) : addDays(today, -30);
    if (from > to) throw new DomainError('REPORTING.INVALID_PERIOD', { ...filters });
    const fromIso = toIsoDate(from);
    const toIso = toIsoDate(to);

    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<MethodRow[]>(
        `SELECT pm.method::text AS method,
                sum(CASE WHEN pa.is_reversal THEN -pa.amount ELSE pa.amount END)::bigint AS amount,
                count(*) FILTER (WHERE NOT pa.is_reversal)::bigint AS count
           FROM payment_allocations pa
           JOIN payments pm ON pm.id = pa.payment_id
           JOIN rent_invoices ri ON ri.id = pa.invoice_id
          WHERE pa.allocation_date BETWEEN $1::date AND $2::date
            AND ($3::uuid IS NULL OR ri.property_id = $3::uuid)
          GROUP BY pm.method`,
        fromIso,
        toIso,
        filters.propertyId ?? null,
      ),
    );

    const byMethod = new Map<string, { amount: bigint; count: bigint }>(
      PAYMENT_METHODS.map((m) => [m, { amount: 0n, count: 0n }]),
    );
    for (const row of rows) {
      if (byMethod.has(row.method))
        byMethod.set(row.method, { amount: row.amount, count: row.count });
    }
    const totalAmount = [...byMethod.values()].reduce((sum, v) => sum + v.amount, 0n);

    return {
      from: fromIso,
      to: toIso,
      totalAmount: toJsonAmount(totalAmount),
      byMethod: PAYMENT_METHODS.map((method) => {
        const entry = byMethod.get(method)!;
        return {
          method,
          amount: toJsonAmount(entry.amount),
          shareBps: toBps(entry.amount, totalAmount),
          count: Number(entry.count),
        };
      }),
    };
  }
}
