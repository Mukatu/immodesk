import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { assertSubjectType, subjectTableOf, type SubjectType } from '../domain/subject';
import {
  PRIVACY_EXPORT_QUEUE,
  type PrivacyExportJobResult,
  type PrivacyExportQueuePort,
} from '../domain/privacy-export-queue.port';
import { PrivacyExportBuilderService } from './privacy-export-builder.service';

export interface ExportJobStatusView {
  status: 'QUEUED' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
  documentId?: string;
  downloadUrl?: string;
  expiresAt?: string;
  error?: string;
}

/**
 * `POST /v1/organizations/{id}/data-export` et `POST /v1/privacy/subject-exports`
 * (contrat § « Export ») : `202 { jobId }`, suivi par `GET /v1/exports/jobs/{jobId}`
 * (phase 9, arbitrage 17) — voir la note du rapport sur la file dédiée
 * (`PRIVACY_EXPORT_QUEUE`) plutôt que la file `reporting-exports`, que cet
 * agent n'a pas le droit d'étendre.
 */
@Injectable()
export class PrivacyExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly builder: PrivacyExportBuilderService,
    @Inject(PRIVACY_EXPORT_QUEUE) private readonly queue: PrivacyExportQueuePort,
  ) {}

  async requestOrganizationExport(
    organizationId: string,
    userId: string,
  ): Promise<{ jobId: string }> {
    const running = await this.queue.findRunningOrganizationExport(organizationId);
    if (running) {
      throw new DomainError('PRIVACY.EXPORT_ALREADY_RUNNING', { organizationId });
    }
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const { jobId } = await this.queue.enqueue({ kind: 'organization', organizationId, userId });
      await audit(this.auditService, tx, {
        action: 'EXPORT',
        operation: AUDIT_OPERATIONS.PRIVACY_EXPORT_REQUESTED,
        entityType: 'organizations',
        entityId: organizationId,
        newState: toJsonState({ kind: 'organization', jobId }),
      });
      return { jobId };
    });
  }

  async requestSubjectExport(
    organizationId: string,
    userId: string,
    subjectType: string,
    subjectId: string,
  ): Promise<{ jobId: string }> {
    const validated = assertSubjectType(subjectType);
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      await this.assertSubjectExists(tx, validated, subjectId);
      const { jobId } = await this.queue.enqueue({
        kind: 'subject',
        organizationId,
        userId,
        subjectType: validated,
        subjectId,
      });
      await audit(this.auditService, tx, {
        action: 'EXPORT',
        operation: AUDIT_OPERATIONS.PRIVACY_EXPORT_REQUESTED,
        entityType: subjectTableOf(validated),
        entityId: subjectId,
        newState: toJsonState({ kind: 'subject', subjectType: validated, jobId }),
      });
      return { jobId };
    });
  }

  private async assertSubjectExists(
    tx: TenantClient,
    subjectType: SubjectType,
    subjectId: string,
  ): Promise<void> {
    const table = subjectTableOf(subjectType);
    const rows = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM ${table} WHERE id = $1::uuid`,
      subjectId,
    );
    if (rows.length === 0)
      throw new DomainError('PRIVACY.SUBJECT_NOT_FOUND', { subjectType, subjectId });
  }

  /** Appelé par le worker BullMQ : construction déléguée à `PrivacyExportBuilderService`. */
  async buildAndStore(
    kind: 'organization' | 'subject',
    organizationId: string,
    userId: string,
    subjectType?: SubjectType,
    subjectId?: string,
  ): Promise<PrivacyExportJobResult> {
    return this.builder.buildAndStore(kind, organizationId, userId, subjectType, subjectId);
  }

  /**
   * Utilitaire de consultation, non câblé à une route HTTP de ce module : le
   * contrat impose `GET /v1/exports/jobs/{jobId}` (phase 9, `reporting`) comme
   * SEUL point de suivi (arbitrage 17). Le raccordement réel de cette file
   * DÉDIÉE à cette route existante suppose une petite extension côté
   * `reporting`, hors du périmètre de cet agent — voir le rapport final.
   */
  async jobStatus(organizationId: string, jobId: string): Promise<ExportJobStatusView> {
    const view = await this.queue.status(jobId);
    if (!view || view.organizationId !== organizationId) {
      throw new DomainError('PLATFORM.NOT_FOUND', { resource: 'privacy-export-job', jobId });
    }
    return {
      status: view.status,
      documentId: view.result?.documentId,
      downloadUrl: view.result?.downloadUrl,
      expiresAt: view.result?.expiresAt,
      error: view.error,
    };
  }
}
