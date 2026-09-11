import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { DocumentsService } from '../../documents/application/documents.service';
import {
  LEASE_CONTRACT_SOURCE,
  LEASE_DOCUMENT_WRITER,
  type LeaseContractSource,
  type LeaseDocumentWriter,
} from '../domain/ports';
import { renderContract } from '../infrastructure/contract-renderer';
import { PdfBrowserService } from '../infrastructure/pdf-browser.service';
import { ContractTemplateService } from './contract-template.service';

export interface LeaseContractJobData {
  organizationId: string;
  userId: string;
  leaseId: string;
  regenerate: boolean;
}

export interface LeaseContractJobResult {
  leaseDocumentId: string;
  documentId: string;
  version: number;
  signatureHash: string;
  reused: boolean;
}

/**
 * Production du contrat de bail en PDF.
 *
 * Le traitement lui-même vit ici, détaché de BullMQ : `LeaseContractWorker`
 * ne fait qu'appeler `process()`. Un test peut donc exercer la génération
 * complète sans file d'attente, et l'exploitation rejouer un contrat à la
 * main. La file apporte la reprise sur échec et la limite de concurrence,
 * pas la logique.
 */
@Injectable()
export class LeaseContractService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly templates: ContractTemplateService,
    private readonly browser: PdfBrowserService,
    private readonly documents: DocumentsService,
    @Inject(LEASE_CONTRACT_SOURCE) private readonly source: LeaseContractSource,
    @Inject(LEASE_DOCUMENT_WRITER) private readonly leaseDocuments: LeaseDocumentWriter,
  ) {}

  /** Prévisualisation HTML : même gabarit, mêmes données, sans Chromium. */
  async previewHtml(organizationId: string, userId: string, leaseId: string): Promise<string> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const data = await this.source.loadContractData(tx, leaseId);
      const template = await this.templates.getIn(tx, organizationId);
      return renderContract(data, template).html;
    });
  }

  /**
   * Produit une version du contrat.
   *
   * Le rendu (lent, hors base) est fait AVANT d'ouvrir la transaction
   * d'écriture : tenir une transaction PostgreSQL ouverte pendant qu'un
   * Chromium compose vingt pages immobiliserait une connexion du pool
   * plusieurs secondes, pour rien.
   */
  async process(data: LeaseContractJobData): Promise<LeaseContractJobResult> {
    const existing = await this.latestContractVersion(data);
    if (existing && !data.regenerate) {
      // Version déjà produite et régénération non demandée : on rend la
      // version existante plutôt que d'en empiler une identique. Chaque
      // version est immuable et occupe une place dans le bucket ; en créer
      // une par clic serait coûteux et illisible.
      return { ...existing, reused: true };
    }

    if (!(await this.browser.available())) {
      throw new DomainError('LEASES.CONTRACT_UNAVAILABLE', { reason: 'NO_BROWSER' });
    }

    const { html, contentHash, reference } = await this.prisma.withTenant(
      data.organizationId,
      data.userId,
      async (tx) => {
        const contractData = await this.source.loadContractData(tx, data.leaseId);
        const template = await this.templates.getIn(tx, data.organizationId);
        const rendered = renderContract(contractData, template);
        return { ...rendered, reference: contractData.lease.reference };
      },
    );

    const generatedAt = new Date();
    const pdf = await this.browser.renderPdf(
      html,
      `Contrat ${reference ?? 'de bail'} — édité le ${generatedAt.toLocaleDateString('fr-FR')}`,
    );
    const fileChecksum = createHash('sha256').update(pdf).digest('base64');

    return this.prisma.withTenant(data.organizationId, data.userId, async (tx) => {
      const document = await this.documents.registerGenerated(
        tx,
        data.organizationId,
        data.userId,
        {
          kind: 'LEASE_CONTRACT',
          fileName: `contrat-${reference ?? data.leaseId}.pdf`,
          mimeType: 'application/pdf',
          body: pdf,
          relatedEntityType: 'lease',
          relatedEntityId: data.leaseId,
          checksumSha256: fileChecksum,
        },
      );

      const archived = await this.leaseDocuments.attachContractVersion(tx, data.organizationId, {
        leaseId: data.leaseId,
        documentId: document.id,
        signatureHash: contentHash,
        generatedByJob: `lease-contract:${data.leaseId}`,
        reference,
      });

      return {
        leaseDocumentId: archived.id,
        documentId: document.id,
        version: archived.version,
        signatureHash: contentHash,
        reused: false,
      };
    });
  }

  /** Trace la demande de génération, avant même sa mise en file. */
  async traceRequest(data: LeaseContractJobData, jobId: string): Promise<void> {
    await this.prisma.withTenant(data.organizationId, data.userId, (tx) =>
      audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.LEASE_CONTRACT_REQUESTED,
        entityType: 'leases',
        entityId: data.leaseId,
        newState: toJsonState({ jobId, regenerate: data.regenerate }),
      }),
    );
  }

  /** Vérifie l'existence du bail et la disponibilité du rendu. */
  async assertGenerable(organizationId: string, userId: string, leaseId: string): Promise<void> {
    if (!(await this.browser.available())) {
      throw new DomainError('LEASES.CONTRACT_UNAVAILABLE', { reason: 'NO_BROWSER' });
    }
    await this.prisma.withTenant(organizationId, userId, (tx) =>
      this.source.loadContractData(tx, leaseId),
    );
  }

  /** Dernière version CONTRACT archivée pour ce bail, si elle existe. */
  private async latestContractVersion(
    data: LeaseContractJobData,
  ): Promise<Omit<LeaseContractJobResult, 'reused'> | null> {
    const row = await this.prisma.withTenant(data.organizationId, data.userId, (tx) =>
      tx.lease_documents.findFirst({
        where: { lease_id: data.leaseId, kind: 'CONTRACT' },
        orderBy: { version: 'desc' },
        select: { id: true, document_id: true, version: true, signature_hash: true },
      }),
    );
    if (!row) return null;
    return {
      leaseDocumentId: row.id,
      documentId: row.document_id,
      version: row.version,
      signatureHash: row.signature_hash ?? '',
    };
  }
}
