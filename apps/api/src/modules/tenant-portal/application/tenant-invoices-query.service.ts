import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { TenantLeaseRow } from '../../../shared/prisma/tenant-directory.service';
import type { InvoiceDetailView } from '../../billing/application/invoice-views';
import {
  INVOICE_SUMMARY_FROM,
  INVOICE_SUMMARY_SELECT,
  toInvoiceSummary,
  type InvoiceSummaryRow,
  type InvoiceSummaryView,
} from '../../billing/application/invoice-views';
import { InvoicesQueryService } from '../../billing/application/invoices-query.service';
import { paginateMerged, type CrossOrgPage } from './cross-org-page';
import { groupLeasesByOrganization } from './tenant-portal-scope';

export interface TenantInvoiceListFilters {
  status?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Lectures des factures du locataire, restreintes aux baux actifs de sa
 * session (`request.tenantLeases`) — jamais un identifiant de tiers accepté
 * en paramètre : le périmètre vient TOUJOURS de la garde, jamais du client.
 * Cross-organisations sur le même principe que `LandlordPortalQueryService`
 * (phase 7) : une organisation par `withTenant`, fusion en mémoire.
 */
@Injectable()
export class TenantInvoicesQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly billingQueries: InvoicesQueryService,
  ) {}

  private get secret(): string {
    return this.config.get('CURSOR_SECRET');
  }

  async list(
    leases: readonly TenantLeaseRow[],
    userId: string,
    filters: TenantInvoiceListFilters,
  ): Promise<CrossOrgPage<InvoiceSummaryView>> {
    const byOrg = groupLeasesByOrganization(leases);
    const perOrg = await Promise.all(
      [...byOrg.entries()].map(([organizationId, orgLeases]) =>
        this.prisma.withTenant(organizationId, userId, (tx) =>
          tx.$queryRawUnsafe<InvoiceSummaryRow[]>(
            `SELECT ${INVOICE_SUMMARY_SELECT}
               FROM ${INVOICE_SUMMARY_FROM}
              WHERE ri.lease_id = ANY($1::uuid[])
                ${filters.status ? 'AND ri.status = $2::invoice_status' : ''}
              ORDER BY ri.issue_date DESC`,
            orgLeases.map((l) => l.leaseId),
            ...(filters.status ? [filters.status] : []),
          ),
        ),
      ),
    );
    const rows = perOrg.flat().map((row) => ({ ...row, sortAt: row.issue_date }));
    const page = paginateMerged(rows, filters.limit, filters.cursor, this.secret);
    return { items: page.items.map(toInvoiceSummary), pageInfo: page.pageInfo };
  }

  /** Détail d'une facture, réutilisant `InvoicesQueryService.detailIn` (billing, `@Global()`). */
  async get(
    leases: readonly TenantLeaseRow[],
    userId: string,
    invoiceId: string,
  ): Promise<InvoiceDetailView> {
    const { organizationId } = await this.findScoped(leases, userId, invoiceId);
    return this.prisma.withTenant(organizationId, userId, (tx) =>
      this.billingQueries.detailIn(tx, invoiceId),
    );
  }

  /**
   * Résout l'organisation d'une facture APPARTENANT à un bail du périmètre,
   * en essayant chaque organisation de la session tour à tour — le volume
   * (quelques agences au plus) rend ce coût négligeable. Utilisé aussi par
   * `TenantPaymentsService` avant d'initier un paiement.
   */
  async findScoped(
    leases: readonly TenantLeaseRow[],
    userId: string,
    invoiceId: string,
  ): Promise<{ organizationId: string; row: InvoiceSummaryRow }> {
    const byOrg = groupLeasesByOrganization(leases);
    for (const [organizationId, orgLeases] of byOrg.entries()) {
      const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
        tx.$queryRawUnsafe<InvoiceSummaryRow[]>(
          `SELECT ${INVOICE_SUMMARY_SELECT}
             FROM ${INVOICE_SUMMARY_FROM}
            WHERE ri.id = $1::uuid AND ri.lease_id = ANY($2::uuid[])`,
          invoiceId,
          orgLeases.map((l) => l.leaseId),
        ),
      );
      if (rows[0]) return { organizationId, row: rows[0] };
    }
    throw new DomainError('PARTIES.PORTAL_OUT_OF_SCOPE', { invoiceId });
  }
}
