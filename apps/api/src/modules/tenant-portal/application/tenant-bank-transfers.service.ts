import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { TenantLeaseRow } from '../../../shared/prisma/tenant-directory.service';
import {
  TRANSFER_SUMMARY_FROM,
  TRANSFER_SUMMARY_SELECT,
  toTransferDeclarationView,
  type TransferDeclarationSummaryRow,
  type TransferDeclarationView,
} from '../../bank-transfers/application/bank-transfer-views';
import { BankTransferDeclarationsService } from '../../bank-transfers/application/bank-transfer-declarations.service';
import { paginateMerged, type CrossOrgPage } from './cross-org-page';
import { groupLeasesByOrganization, requireLeaseInScope } from './tenant-portal-scope';

export interface TenantTransferDeclareInput {
  leaseId: string;
  invoiceId?: string | null;
  declaredAmount: bigint;
  transferDate: Date;
  transferReference?: string | null;
  payerName: string;
  payerBankCode?: string | null;
  payerBankName?: string | null;
  payerAccountNumber?: string | null;
  beneficiaryBankAccountId: string;
  proofDocumentId: string;
  clientRef: string;
  notes?: string | null;
}

/**
 * Virement déclaré par le locataire (contrat, § « Virement déclaré ») :
 * preuve obligatoire (`proofDocumentId`, jamais optionnel ici — contrairement
 * au DTO général du module `bank-transfers`), sur EXACTEMENT le même bail que
 * la session. La validation reste réservée au gestionnaire : ni `review`, ni
 * `approve`, ni `reject` ne sont exposés au portail.
 */
@Injectable()
export class TenantBankTransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly declarations: BankTransferDeclarationsService,
  ) {}

  private get secret(): string {
    return this.config.get('CURSOR_SECRET');
  }

  async declare(
    leases: readonly TenantLeaseRow[],
    userId: string,
    input: TenantTransferDeclareInput,
  ): Promise<TransferDeclarationView> {
    const lease = requireLeaseInScope(leases, input.leaseId);
    if (input.invoiceId) {
      await this.assertInvoiceBelongsToLease(lease, userId, input.invoiceId);
    }

    const { view } = await this.declarations.declare(
      lease.organizationId,
      { userId, role: 'COLLECTOR' },
      { ...input, tenantId: lease.tenantId },
    );
    return view;
  }

  async list(
    leases: readonly TenantLeaseRow[],
    userId: string,
    filters: { limit?: number; cursor?: string },
  ): Promise<CrossOrgPage<TransferDeclarationView>> {
    const byOrg = groupLeasesByOrganization(leases);
    const perOrg = await Promise.all(
      [...byOrg.entries()].map(([organizationId, orgLeases]) =>
        this.prisma.withTenant(organizationId, userId, (tx) =>
          tx.$queryRawUnsafe<TransferDeclarationSummaryRow[]>(
            `SELECT ${TRANSFER_SUMMARY_SELECT} FROM ${TRANSFER_SUMMARY_FROM}
              WHERE b.lease_id = ANY($1::uuid[])
              ORDER BY b.created_at DESC`,
            orgLeases.map((l) => l.leaseId),
          ),
        ),
      ),
    );
    const rows = perOrg.flat().map((row) => ({ ...row, sortAt: row.created_at }));
    const page = paginateMerged(rows, filters.limit, filters.cursor, this.secret);
    return { items: page.items.map((r) => toTransferDeclarationView(r)), pageInfo: page.pageInfo };
  }

  private async assertInvoiceBelongsToLease(
    lease: TenantLeaseRow,
    userId: string,
    invoiceId: string,
  ): Promise<void> {
    const found = await this.prisma.withTenant(lease.organizationId, userId, (tx) =>
      tx.rent_invoices.findFirst({
        where: { id: invoiceId, lease_id: lease.leaseId },
        select: { id: true },
      }),
    );
    if (!found) throw new DomainError('PARTIES.PORTAL_RELATED_ENTITY_INVALID', { invoiceId });
  }
}
