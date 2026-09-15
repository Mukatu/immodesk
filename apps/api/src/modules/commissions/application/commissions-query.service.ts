import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { toJsonAmount } from '../../../shared/money/amount';
import { monthBounds } from '../../../shared/time/business-date';
import { toCommissionView, type CommissionRow, type CommissionView } from './commission-views';

export interface CommissionListFilters {
  mandateId?: string;
  landlordId?: string;
  /** `YYYY-MM` : filtre sur le mois de `period_start` (contrat, `period=`). */
  period?: string;
  status?: string;
  limit?: number;
  cursor?: string;
}

export interface CommissionTotals {
  amount: number;
  vatAmount: number;
  totalAmount: number;
}

/**
 * Lectures transverses des commissions : liste paginée avec `totals`
 * (contrat, route `GET /v1/commissions`, rôle `OWNER`). `totals` porte sur
 * l'ENSEMBLE filtré, pas seulement la page courante — calculé par une
 * seconde requête `SUM` sur les mêmes conditions, hors keyset.
 */
@Injectable()
export class CommissionsQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async list(
    organizationId: string,
    userId: string,
    filters: CommissionListFilters,
  ): Promise<Page<CommissionView> & { totals: CommissionTotals }> {
    const conditions = ['c.organization_id = $1::uuid'];
    const params: unknown[] = [organizationId];

    if (filters.mandateId) {
      params.push(filters.mandateId);
      conditions.push(`c.mandate_id = $${params.length}::uuid`);
    }
    if (filters.landlordId) {
      params.push(filters.landlordId);
      conditions.push(`c.landlord_id = $${params.length}::uuid`);
    }
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`c.status = $${params.length}::commission_status`);
    }
    if (filters.period) {
      const bounds = monthBounds(filters.period);
      if (!bounds) {
        throw new DomainError('VALIDATION.INVALID_PAYLOAD', { period: 'Format AAAA-MM attendu.' });
      }
      params.push(bounds.start, bounds.end);
      conditions.push(`c.period_start >= $${params.length - 1}::date`);
      conditions.push(`c.period_start <= $${params.length}::date`);
    }

    const whereClause = conditions.join(' AND ');

    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'c');
    const pageParams = [...params];
    if (keyset.condition) pageParams.push(...keyset.params);

    const [rows, totalsRows] = await this.prisma.withTenant(organizationId, userId, (tx) =>
      Promise.all([
        tx.$queryRawUnsafe<CommissionRow[]>(
          `SELECT c.*
             FROM commissions c
            WHERE ${whereClause}${keyset.condition ? ` AND ${keyset.condition}` : ''}
            ${keysetOrderBy('c')}
            LIMIT ${keyset.fetch}`,
          ...pageParams,
        ),
        tx.$queryRawUnsafe<
          Array<{ amount: bigint | null; vat_amount: bigint | null; total_amount: bigint | null }>
        >(
          // sum(bigint) renvoie NUMERIC en PostgreSQL, jamais bigint : sans
          // le cast explicite, Prisma renvoie une chaîne/Decimal que
          // TypeScript croit être un bigint (mêmes symptômes que
          // accrueForPeriod ci-dessus, voir son commentaire).
          `SELECT coalesce(sum(c.amount), 0)::bigint AS amount,
                  coalesce(sum(c.vat_amount), 0)::bigint AS vat_amount,
                  coalesce(sum(c.total_amount), 0)::bigint AS total_amount
             FROM commissions c
            WHERE ${whereClause}`,
          ...params,
        ),
      ]),
    );

    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    const sums = totalsRows[0] ?? { amount: 0n, vat_amount: 0n, total_amount: 0n };
    return {
      items: page.items.map(toCommissionView),
      pageInfo: page.pageInfo,
      totals: {
        amount: toJsonAmount(sums.amount ?? 0n),
        vatAmount: toJsonAmount(sums.vat_amount ?? 0n),
        totalAmount: toJsonAmount(sums.total_amount ?? 0n),
      },
    };
  }
}
