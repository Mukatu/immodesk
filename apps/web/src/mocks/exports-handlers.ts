import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 9 (exports CSV), routes conformes à docs/api/phase9-contract.md
 * (section « Routes », qui prime sur la section « Exports » : pas de préfixe
 * `/organizations/{id}/`). Format CSV uniquement (arbitrage 5) : aucune sortie
 * Excel n'est jamais produite ici. Convention de démonstration assumée pour ce
 * mock : l'export `dashboard` emprunte toujours la voie travail de fond (202),
 * les autres restent synchrones (201), afin que l'écran gère réellement les
 * deux réponses possibles du contrat sans dépendre d'un volume de données réel.
 */
import { API_BASE } from './api-base';
import { badRequest, documents, nextId, orgIdFromRequest, unauthorizedOrg } from './handlers';
import { invoices } from './billing-seed';
import { payments } from './payments-seed';
import type { ExportKind } from '@/lib/api/types';
import type { MockDocument } from './handlers';

const EXPORT_KINDS: ExportKind[] = ['invoices', 'payments', 'arrears', 'dashboard'];

interface ExportJobRecord {
  status: 'DONE';
  documentId: string;
  downloadUrl: string;
}

export const exportJobs = new Map<string, ExportJobRecord>();

function rowCountFor(kind: ExportKind, organizationId: string): number {
  if (kind === 'invoices') {
    return [...invoices.values()].filter((i) => i.organizationId === organizationId).length;
  }
  if (kind === 'payments') {
    return [...payments.values()].filter((p) => p.organizationId === organizationId).length;
  }
  if (kind === 'arrears') {
    return [...invoices.values()].filter(
      (i) =>
        i.organizationId === organizationId &&
        (i.status === 'OVERDUE' || i.status === 'PARTIALLY_PAID'),
    ).length;
  }
  return 4; // Une ligne par mois de série pour le tableau de bord, ordre de grandeur du mock.
}

function createExportDocument(
  organizationId: string,
  kind: ExportKind,
  rowCount: number,
): MockDocument {
  const yearMonth = new Date().toISOString().slice(0, 7);
  const fileName = `${kind}-${yearMonth}.csv`;
  const document: MockDocument = {
    id: nextId('document'),
    organizationId,
    objectKey: `exports/${organizationId}/${fileName}`,
    kind: 'OTHER',
    fileName,
    mimeType: 'text/csv',
    sizeBytes: rowCount * 96,
    widthPx: null,
    heightPx: null,
    pagesCount: null,
    relatedEntityType: null,
    relatedEntityId: null,
    uploadedByUserId: null,
    uploadedAt: new Date().toISOString(),
    retentionUntil: null,
    deletedAt: null,
  };
  documents.set(document.id, document);
  return document;
}

function downloadUrlFor(document: MockDocument): string {
  return `https://mock-storage.immodesk.internal/download/${document.objectKey}`;
}

export const exportsHandlers = [
  http.post(`${API_BASE}/exports/:kind`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const kind = String(params.kind) as ExportKind;
    if (!EXPORT_KINDS.includes(kind)) {
      return badRequest('EXPORTS.INVALID_KIND', 'Type d’export inconnu.');
    }
    const rowCount = rowCountFor(kind, organizationId);

    if (kind === 'dashboard') {
      const jobId = nextId('exportjob');
      const document = createExportDocument(organizationId, kind, rowCount);
      exportJobs.set(jobId, {
        status: 'DONE',
        documentId: document.id,
        downloadUrl: downloadUrlFor(document),
      });
      return HttpResponse.json({ jobId }, { status: 202 });
    }

    const document = createExportDocument(organizationId, kind, rowCount);
    return HttpResponse.json(
      {
        documentId: document.id,
        downloadUrl: downloadUrlFor(document),
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        rowCount,
      },
      { status: 201 },
    );
  }),

  http.get(`${API_BASE}/exports/jobs/:jobId`, ({ params }) => {
    const job = exportJobs.get(String(params.jobId));
    if (!job)
      return HttpResponse.json(
        { code: 'EXPORTS.JOB_NOT_FOUND', message: 'Travail introuvable.' },
        { status: 404 },
      );
    return HttpResponse.json(job);
  }),
];
