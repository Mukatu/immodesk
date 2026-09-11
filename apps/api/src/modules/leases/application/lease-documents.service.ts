import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import type { LeaseContractVersionInput, LeaseDocumentWriter } from '../../pdf/domain/ports';
import { parseIsoDate } from '../domain/calendar';
import type { LeaseDocumentKind } from '../domain/lease-status';
import { toLeaseDocumentView, type LeaseDocumentRow, type LeaseDocumentView } from './lease-views';
import { LeasesService } from './leases.service';

export interface LeaseDocumentInput {
  documentId: string;
  kind: LeaseDocumentKind;
  title: string;
  effectiveDate?: string;
  isSigned?: boolean;
  signedAt?: string;
}

@Injectable()
export class LeaseDocumentsService implements LeaseDocumentWriter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly leases: LeasesService,
  ) {}

  async list(
    organizationId: string,
    userId: string,
    leaseId: string,
  ): Promise<LeaseDocumentView[]> {
    const rows = await this.prisma.withTenant(organizationId, userId, async (tx) => {
      await this.leases.require(tx, leaseId);
      return this.rowsFor(tx, leaseId);
    });
    return rows.map(toLeaseDocumentView);
  }

  /**
   * Rattache un document déjà téléversé (contrat signé scanné, avenant,
   * congé). La version s'incrémente PAR TYPE : un avenant ne décale pas la
   * numérotation des contrats.
   */
  async attach(
    organizationId: string,
    userId: string,
    leaseId: string,
    input: LeaseDocumentInput,
  ): Promise<LeaseDocumentView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      await this.leases.require(tx, leaseId);

      const document = await tx.documents.findFirst({
        where: { id: input.documentId, deleted_at: null },
        select: { id: true },
      });
      if (!document) throw new DomainError('DOCUMENTS.NOT_FOUND', { documentId: input.documentId });

      const duplicate = await tx.lease_documents.findFirst({
        where: { lease_id: leaseId, document_id: input.documentId },
        select: { id: true },
      });
      if (duplicate) {
        throw new DomainError('LEASES.DOCUMENT_DUPLICATE', {
          leaseId,
          documentId: input.documentId,
        });
      }

      const id = newId();
      const created = (await tx.lease_documents.create({
        data: {
          id,
          organization_id: organizationId,
          lease_id: leaseId,
          kind: input.kind,
          document_id: input.documentId,
          version: await this.nextVersion(tx, leaseId, input.kind),
          title: input.title.trim(),
          effective_date: input.effectiveDate ? parseIsoDate(input.effectiveDate) : null,
          is_signed: input.isSigned ?? false,
          signed_at: input.signedAt ? new Date(input.signedAt) : null,
          created_by_user_id: userId,
        },
      })) as unknown as LeaseDocumentRow;

      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.LEASE_DOCUMENT_ATTACHED,
        entityType: 'lease_documents',
        entityId: id,
        newState: toJsonState(toLeaseDocumentView(created)),
      });
      return toLeaseDocumentView(created);
    });
  }

  /**
   * Implémentation du port `LEASE_DOCUMENT_WRITER` : archivage d'une version
   * de contrat produite par le worker PDF.
   *
   * UNE VERSION EST IMMUABLE. Rien ici ne met à jour une ligne existante :
   * régénérer le contrat crée la version suivante et laisse la précédente
   * intacte, avec son empreinte. C'est ce qui permet de prouver qu'un
   * document signé n'a pas été réécrit après coup.
   */
  async attachContractVersion(
    tx: TenantClient,
    organizationId: string,
    input: LeaseContractVersionInput,
  ): Promise<{ id: string; version: number }> {
    const version = await this.nextVersion(tx, input.leaseId, 'CONTRACT');
    const id = newId();
    const label = input.reference ?? 'brouillon';

    await tx.lease_documents.create({
      data: {
        id,
        organization_id: organizationId,
        lease_id: input.leaseId,
        kind: 'CONTRACT',
        document_id: input.documentId,
        version,
        title: `Contrat de bail ${label} v${version}`,
        is_signed: false,
        signature_hash: input.signatureHash,
        generated_by_job: input.generatedByJob,
      },
    });

    // `leases.contract_document_id` pointe la DERNIÈRE version : c'est le
    // document à imprimer. Les précédentes restent lisibles par
    // `lease_documents`, jamais écrasées.
    await tx.leases.update({
      where: { id: input.leaseId },
      data: { contract_document_id: input.documentId, updated_at: new Date() },
    });

    // L'organisation est passée EXPLICITEMENT : le worker BullMQ s'exécute
    // hors du contexte `AsyncLocalStorage` d'une requête HTTP, et `audit()`
    // n'aurait rien à y lire. C'est la même règle que pour le cron des baux
    // et la purge des documents.
    await audit(this.auditService, tx, {
      organizationId,
      actorLabel: 'worker.lease-contract',
      action: 'CREATE',
      operation: AUDIT_OPERATIONS.LEASE_CONTRACT_GENERATED,
      entityType: 'lease_documents',
      entityId: id,
      newState: toJsonState({
        leaseId: input.leaseId,
        documentId: input.documentId,
        version,
        signatureHash: input.signatureHash,
        generatedByJob: input.generatedByJob,
      }),
    });

    return { id, version };
  }

  async rowsFor(tx: TenantClient, leaseId: string): Promise<LeaseDocumentRow[]> {
    return (await tx.lease_documents.findMany({
      where: { lease_id: leaseId },
      orderBy: [{ kind: 'asc' }, { version: 'asc' }],
    })) as unknown as LeaseDocumentRow[];
  }

  /** `max(version) + 1` pour ce bail et ce type, 1 s'il n'y en a aucune. */
  private async nextVersion(
    tx: TenantClient,
    leaseId: string,
    kind: LeaseDocumentKind,
  ): Promise<number> {
    const rows = await tx.$queryRawUnsafe<Array<{ next: number }>>(
      `SELECT COALESCE(max(version), 0) + 1 AS next
         FROM lease_documents
        WHERE lease_id = $1::uuid AND kind = $2::lease_document_kind`,
      leaseId,
      kind,
    );
    return Number(rows[0]?.next ?? 1);
  }
}
