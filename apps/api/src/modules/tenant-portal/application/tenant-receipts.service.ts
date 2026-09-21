import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { TenantLeaseRow } from '../../../shared/prisma/tenant-directory.service';
import { ReceiptDocumentsService } from '../../receipts/application/receipt-documents.service';
import { groupLeasesByOrganization } from './tenant-portal-scope';

/**
 * Téléchargement de quittance par le locataire (contrat, § « Quittance ») :
 * le PDF déjà produit par la phase 3, avec son jeton de vérification
 * publique inchangé — `ReceiptDocumentsService.receiptPdf` (module
 * `receipts`, `@Global()`) n'est PAS réimplémenté, mais il ne scope QUE par
 * organisation (RLS) : une quittance d'un autre locataire de la MÊME agence
 * lui serait sinon accessible. Cette classe ajoute donc le contrôle de
 * périmètre par bail (`receipts.lease_id`) qui manque à cet appel générique,
 * avant de le déléguer.
 */
@Injectable()
export class TenantReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: ReceiptDocumentsService,
  ) {}

  async pdf(
    leases: readonly TenantLeaseRow[],
    userId: string,
    receiptId: string,
  ): Promise<{ downloadUrl: string; expiresAt: string }> {
    const byOrg = groupLeasesByOrganization(leases);
    for (const [organizationId, orgLeases] of byOrg.entries()) {
      const found = await this.prisma.withTenant(organizationId, userId, (tx) =>
        tx.receipts.findFirst({
          where: { id: receiptId, lease_id: { in: orgLeases.map((l) => l.leaseId) } },
          select: { id: true },
        }),
      );
      if (found) return this.documents.receiptPdf(organizationId, userId, receiptId);
    }
    throw new DomainError('PARTIES.PORTAL_OUT_OF_SCOPE', { receiptId });
  }
}
