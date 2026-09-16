import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { DocumentsService } from '../../documents/application/documents.service';
import { PdfBrowserService } from '../../pdf/infrastructure/pdf-browser.service';
import type { InspectionItemRow, InspectionRow } from './inspection-views';

/**
 * Rapport PDF d'un état des lieux, par le worker Puppeteer partagé
 * (`PdfBrowserService`). Calqué sur `OwnerStatementDocumentsService` :
 * rendu idempotent (un rapport déjà généré n'est pas refait), et une
 * organisation sans navigateur de rendu reste `SIGNED` sans PDF plutôt que
 * d'échouer.
 */
@Injectable()
export class InspectionReportService {
  private readonly logger = new Logger(InspectionReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly browser: PdfBrowserService,
    private readonly documents: DocumentsService,
  ) {}

  async generate(organizationId: string, inspectionId: string): Promise<void> {
    const loaded = await this.prisma.withTenant(organizationId, null, async (tx) => {
      const inspection = (await tx.inspections.findFirst({
        where: { id: inspectionId },
      })) as unknown as InspectionRow | null;
      if (!inspection || inspection.report_document_id) return null;
      const items = (await tx.inspection_items.findMany({
        where: { inspection_id: inspectionId },
        orderBy: { position: 'asc' },
      })) as unknown as InspectionItemRow[];
      return { inspection, items };
    });
    if (!loaded) return;

    if (!(await this.browser.available())) {
      this.logger.warn(
        `État des lieux ${loaded.inspection.reference} signé sans rapport PDF : aucun navigateur de rendu.`,
      );
      return;
    }

    const html = renderInspectionHtml(loaded.inspection, loaded.items);
    let pdf: Buffer;
    try {
      pdf = await this.browser.renderPdf(html, `État des lieux ${loaded.inspection.reference}`);
    } catch (error) {
      this.logger.warn(
        `Rendu du rapport ${loaded.inspection.reference} impossible : ${(error as Error).message}`,
      );
      return;
    }

    const stored = await this.documents.storeGeneratedObject(organizationId, {
      kind: 'INSPECTION_REPORT',
      mimeType: 'application/pdf',
      body: pdf,
    });
    await this.prisma.withTenant(organizationId, null, async (tx) => {
      const document = await this.documents.registerStoredObject(tx, organizationId, null, stored, {
        kind: 'INSPECTION_REPORT',
        fileName: `edl-${loaded.inspection.reference}.pdf`,
        mimeType: 'application/pdf',
        relatedEntityType: 'inspection',
        relatedEntityId: inspectionId,
        checksumSha256: createHash('sha256').update(pdf).digest('base64'),
      });
      await tx.inspections.update({
        where: { id: inspectionId },
        data: { report_document_id: document.id },
      });
    });
  }

  /** `GET /v1/inspections/{id}/pdf` : génère à la demande si absent. */
  async downloadUrl(
    organizationId: string,
    userId: string,
    inspectionId: string,
  ): Promise<{ downloadUrl: string; expiresAt: string }> {
    let documentId = await this.documentOf(organizationId, inspectionId);
    if (!documentId) {
      await this.generate(organizationId, inspectionId);
      documentId = await this.documentOf(organizationId, inspectionId);
    }
    if (!documentId) throw new DomainError('INSPECTIONS.REPORT_NOT_READY', { inspectionId });
    return this.documents.createDownloadUrl(organizationId, userId, documentId);
  }

  private async documentOf(organizationId: string, inspectionId: string): Promise<string | null> {
    return this.prisma.withTenant(organizationId, null, async (tx) => {
      const row = await tx.inspections.findFirst({
        where: { id: inspectionId },
        select: { report_document_id: true },
      });
      return row?.report_document_id ?? null;
    });
  }
}

function renderInspectionHtml(inspection: InspectionRow, items: InspectionItemRow[]): string {
  const rows = items
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.room_label)}</td>
        <td>${escapeHtml(item.element_label)}</td>
        <td>${escapeHtml(item.condition)}</td>
        <td>${escapeHtml(item.damage_description ?? '')}</td>
      </tr>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body { font-family: sans-serif; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #999; padding: 4px 8px; text-align: left; }
  </style></head><body>
    <h1>État des lieux ${escapeHtml(inspection.reference)}</h1>
    <p>Type : ${escapeHtml(inspection.inspection_type)} — Statut : ${escapeHtml(inspection.status)}</p>
    <table><thead><tr><th>Pièce</th><th>Élément</th><th>État</th><th>Remarques</th></tr></thead>
      <tbody>${rows}</tbody></table>
  </body></html>`;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}
