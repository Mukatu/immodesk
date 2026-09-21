import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  toSubscriptionInvoiceView,
  type SubscriptionInvoiceRow,
  type SubscriptionInvoiceView,
} from './subscription-invoice-views';

export interface ListSubscriptionInvoicesFilters {
  status?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Factures d'abonnement (contrat phase 10, § « Abonnement SaaS » et routes
 * `GET .../subscription-invoices`). Quatre statuts seulement en pratique
 * (arbitrage 2) : `status` filtre tel quel, sans validation supplémentaire —
 * une valeur hors énumération ne correspond simplement à aucune ligne.
 */
@Injectable()
export class SubscriptionInvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async list(
    organizationId: string,
    userId: string,
    filters: ListSubscriptionInvoicesFilters,
  ): Promise<Page<SubscriptionInvoiceView>> {
    const conditions = ['i.organization_id = $1::uuid'];
    const params: unknown[] = [organizationId];
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`i.status = $${params.length}::invoice_status`);
    }
    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'i');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<SubscriptionInvoiceRow[]>(
        `SELECT * FROM subscription_invoices i WHERE ${conditions.join(' AND ')} ${keysetOrderBy('i')} LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );
    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return { items: page.items.map(toSubscriptionInvoiceView), pageInfo: page.pageInfo };
  }

  async get(organizationId: string, userId: string, id: string): Promise<SubscriptionInvoiceView> {
    const row = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.subscription_invoices.findFirst({ where: { id, organization_id: organizationId } }),
    );
    if (!row) throw new DomainError('SUBSCRIPTIONS.INVOICE_NOT_FOUND', { id });
    return toSubscriptionInvoiceView(row as SubscriptionInvoiceRow);
  }
}
