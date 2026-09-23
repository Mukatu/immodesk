import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { DocumentsService } from '../../documents/application/documents.service';
import type { SubjectType } from '../domain/subject';
import type { PrivacyExportJobResult } from '../domain/privacy-export-queue.port';
import { OrgExportService } from './org-export.service';
import { SubjectExportService } from './subject-export.service';

/**
 * Construction et rangement effectifs d'un export (contrat § « Export ») :
 * séparé de `PrivacyExportsService` pour rester sous 180 lignes par fichier.
 * Appelé par `infrastructure/privacy-export-worker.ts`, jamais directement
 * par un contrôleur.
 */
@Injectable()
export class PrivacyExportBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly auditService: AuditService,
    private readonly documents: DocumentsService,
    private readonly orgExport: OrgExportService,
    private readonly subjectExport: SubjectExportService,
  ) {}

  async buildAndStore(
    kind: 'organization' | 'subject',
    organizationId: string,
    userId: string,
    subjectType?: SubjectType,
    subjectId?: string,
  ): Promise<PrivacyExportJobResult> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const built =
        kind === 'organization'
          ? await this.orgExport.build(tx, organizationId)
          : await this.subjectExport.build(
              tx,
              organizationId,
              subjectType as SubjectType,
              subjectId as string,
            );

      const stored = await this.documents.storeGeneratedObject(organizationId, {
        kind: 'OTHER',
        mimeType: 'application/zip',
        body: built.zip,
      });
      const fileName =
        kind === 'organization'
          ? `export-organisation-${organizationId}.zip`
          : `export-${subjectType}-${subjectId}.zip`;
      const document = await this.documents.registerStoredObject(
        tx,
        organizationId,
        userId,
        stored,
        {
          kind: 'OTHER',
          fileName,
          mimeType: 'application/zip',
        },
      );
      const ttlSeconds = this.config.get('PRIVACY_EXPORT_LINK_TTL_SECONDS');
      const { downloadUrl, expiresAt } = await this.documents.createDownloadUrl(
        organizationId,
        userId,
        document.id,
        ttlSeconds,
      );

      await audit(this.auditService, tx, {
        action: 'EXPORT',
        operation: AUDIT_OPERATIONS.PRIVACY_EXPORT_COMPLETED,
        entityType: 'documents',
        entityId: document.id,
        newState: toJsonState({
          kind,
          fileName,
          rowCount: built.rowCount,
          tableCount: built.tableCount,
        }),
      });

      return {
        documentId: document.id,
        downloadUrl,
        expiresAt,
        tableCount: built.tableCount,
        rowCount: built.rowCount,
      };
    });
  }
}
