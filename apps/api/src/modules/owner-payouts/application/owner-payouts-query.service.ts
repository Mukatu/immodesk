import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { toPayoutView, type OwnerPayoutRow, type PayoutView } from './owner-payout-views';

export interface PayoutListFilters {
  status?: string;
  landlordId?: string;
  limit?: number;
  cursor?: string;
}

/**
 * `GET /v1/owner-payouts` (contrat, `ACCOUNTANT`). Le `Payout` du contrat
 * (§ Types) n'a pas besoin de jointure (ni nom de bailleur, ni relevé) :
 * lecture directe de `owner_payouts`, sans composition — contrairement à
 * `MandatesQueryService`/`OwnerStatementsQueryService`, qui joignent
 * `landlords` pour l'affichage.
 */
@Injectable()
export class OwnerPayoutsQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async list(
    organizationId: string,
    userId: string,
    filters: PayoutListFilters,
  ): Promise<Page<PayoutView>> {
    const conditions = ['organization_id = $1::uuid'];
    const params: unknown[] = [organizationId];

    if (filters.status) {
      params.push(filters.status);
      conditions.push(`status = $${params.length}::payout_status`);
    }
    if (filters.landlordId) {
      params.push(filters.landlordId);
      conditions.push(`landlord_id = $${params.length}::uuid`);
    }

    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1);
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }

    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<OwnerPayoutRow[]>(
        `SELECT * FROM owner_payouts
          WHERE ${conditions.join(' AND ')}
          ${keysetOrderBy()}
          LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );

    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return { items: page.items.map(toPayoutView), pageInfo: page.pageInfo };
  }
}
