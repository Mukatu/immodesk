import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { toExpenseView, type ExpenseRow, type ExpenseView } from './expense-views';

export interface ExpenseListFilters {
  status?: string;
  propertyId?: string;
  landlordId?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Lectures transverses des dépenses : liste paginée (contrat, route
 * `GET /v1/expenses`, rôle `ACCOUNTANT`). Séparé de `ExpensesService`
 * comme `DepositsQueryService`.
 */
@Injectable()
export class ExpensesQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async list(
    organizationId: string,
    userId: string,
    filters: ExpenseListFilters,
  ): Promise<Page<ExpenseView>> {
    const conditions = ['e.organization_id = $1::uuid'];
    const params: unknown[] = [organizationId];

    if (filters.status) {
      params.push(filters.status);
      conditions.push(`e.status = $${params.length}::expense_status`);
    }
    if (filters.propertyId) {
      params.push(filters.propertyId);
      conditions.push(`e.property_id = $${params.length}::uuid`);
    }
    if (filters.landlordId) {
      params.push(filters.landlordId);
      conditions.push(`e.landlord_id = $${params.length}::uuid`);
    }
    if (filters.from) {
      params.push(filters.from);
      conditions.push(`e.expense_date >= $${params.length}::date`);
    }
    if (filters.to) {
      params.push(filters.to);
      conditions.push(`e.expense_date <= $${params.length}::date`);
    }

    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'e');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }

    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<ExpenseRow[]>(
        `SELECT e.*
           FROM expenses e
          WHERE ${conditions.join(' AND ')}
          ${keysetOrderBy('e')}
          LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );

    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return { items: page.items.map(toExpenseView), pageInfo: page.pageInfo };
  }
}
