import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { decodeCursor, encodeCursor } from '../../../shared/pagination/cursor';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { SyncPullResult } from '../domain/sync-pull-types';
import type { SyncReader } from '../domain/sync-types';
import {
  toCashReceiptSummary,
  toInvoiceSummary,
  toLeaseSummary,
  toPropertySummary,
  toRemittanceSummary,
  toTenantSummary,
  toUnitSummary,
} from './sync-pull-mapper';

const OPEN_INVOICE_STATUSES = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'];
const PULL_LIMIT = 500;

/**
 * `GET /v1/sync/pull` : périmètre strictement limité au démarcheur — les
 * baux dont il est collecteur, leurs lots, immeubles et locataires, les
 * factures ouvertes, ses reçus de caisse et sa remise en cours. Un MANAGER
 * ou un OWNER reçoit le périmètre complet de l'organisation
 * (docs/api/phase5-contract.md, § « Téléchargement du périmètre »).
 */
@Injectable()
export class SyncPullService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async pull(
    organizationId: string,
    reader: SyncReader,
    options: { since?: string; limit?: number },
  ): Promise<SyncPullResult> {
    const secret = this.config.get('CURSOR_SECRET');
    const since = options.since ? new Date(decodeCursor(options.since, secret).createdAt) : null;
    const limit = Math.min(Math.max(options.limit ?? PULL_LIMIT, 1), 1000);
    const requestedAt = new Date();
    const isCollectorScope = reader.role === 'COLLECTOR';
    const sinceFilter = since ? { updated_at: { gt: since } } : {};

    const result = await this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      const leaseScope = isCollectorScope ? { collector_user_id: reader.userId } : {};
      const scopedLeases = await tx.leases.findMany({
        where: { ...leaseScope, deleted_at: null },
        select: { id: true, unit_id: true, property_id: true, primary_tenant_id: true },
      });
      const leaseIds = scopedLeases.map((l) => l.id);
      const unitIds = [...new Set(scopedLeases.map((l) => l.unit_id))];
      const propertyIds = [...new Set(scopedLeases.map((l) => l.property_id))];
      const tenantIds = [...new Set(scopedLeases.map((l) => l.primary_tenant_id))];

      const [
        leases,
        units,
        properties,
        tenants,
        invoices,
        cashReceipts,
        remittances,
        deletedLeases,
      ] = await Promise.all([
        tx.leases.findMany({
          where: { id: { in: leaseIds }, ...sinceFilter },
          orderBy: { updated_at: 'asc' },
          take: limit + 1,
        }),
        tx.units.findMany({
          where: { id: { in: unitIds }, ...sinceFilter },
          take: limit + 1,
        }),
        tx.properties.findMany({
          where: { id: { in: propertyIds }, ...sinceFilter },
          take: limit + 1,
        }),
        tx.tenants.findMany({
          where: { id: { in: tenantIds }, ...sinceFilter },
          take: limit + 1,
        }),
        tx.rent_invoices.findMany({
          where: {
            lease_id: { in: leaseIds },
            status: { in: OPEN_INVOICE_STATUSES as never[] },
            ...sinceFilter,
          },
          take: limit + 1,
        }),
        tx.cash_receipts.findMany({
          where: {
            ...(isCollectorScope ? { collector_user_id: reader.userId } : {}),
            ...sinceFilter,
          },
          take: limit + 1,
        }),
        tx.cash_remittances.findMany({
          where: {
            ...(isCollectorScope ? { collector_user_id: reader.userId } : {}),
            status: { in: ['OPEN', 'SUBMITTED'] as never[] },
            ...sinceFilter,
          },
          take: limit + 1,
        }),
        // Sorties de périmètre : baux réaffectés hors de ce collecteur, ou
        // supprimés — uniquement pertinent en incrémental (`since` posé).
        since && isCollectorScope
          ? tx.leases.findMany({
              where: {
                updated_at: { gt: since },
                OR: [{ deleted_at: { not: null } }, { collector_user_id: { not: reader.userId } }],
              },
              select: { id: true },
              take: limit + 1,
            })
          : Promise.resolve([]),
      ]);

      return {
        leases,
        units,
        properties,
        tenants,
        invoices,
        cashReceipts,
        remittances,
        deletedLeases,
      };
    });

    const hasMore = [
      result.leases,
      result.units,
      result.properties,
      result.tenants,
      result.invoices,
      result.cashReceipts,
      result.remittances,
    ].some((rows) => rows.length > limit);

    return {
      serverTime: requestedAt.toISOString(),
      nextCursor: encodeCursor({ createdAt: requestedAt.toISOString(), id: 'sync-pull' }, secret),
      hasMore,
      retentionHours: this.config.get('MOBILE_RETENTION_HOURS'),
      changed: {
        properties: result.properties.slice(0, limit).map(toPropertySummary),
        units: result.units.slice(0, limit).map(toUnitSummary),
        tenants: result.tenants.slice(0, limit).map(toTenantSummary),
        leases: result.leases.slice(0, limit).map(toLeaseSummary),
        invoices: result.invoices.slice(0, limit).map(toInvoiceSummary),
        cashReceipts: result.cashReceipts.slice(0, limit).map(toCashReceiptSummary),
        remittances: result.remittances.slice(0, limit).map(toRemittanceSummary),
      },
      deleted: result.deletedLeases.map((row: { id: string }) => ({
        resourceType: 'leases',
        id: row.id,
      })),
    };
  }
}
