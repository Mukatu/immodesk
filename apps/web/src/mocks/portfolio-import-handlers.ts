import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 10, import de portefeuille. Même mécanisme que les exports
 * de la phase 9 (arbitrage n°3 du contrat, voir exports-handlers.ts) : la
 * route de lancement renvoie `202 { jobId }`, la route de suivi
 * (`GET /portfolio-imports/{jobId}`) renvoie directement le rapport avec son
 * statut dedans — pas de wrapper séparé. Le job passe à DONE immédiatement
 * (pas de délai réel), pour un scénario e2e rapide et déterministe.
 */
import { API_BASE } from './api-base';
import {
  conflict,
  documents,
  nextId,
  notFound,
  orgIdFromRequest,
  unauthorizedOrg,
} from './handlers';
import type { MockDocument } from './handlers';
import {
  buildDeterministicImportReport,
  hasRunningImport,
  portfolioImportJobs,
  serializePortfolioImportReport,
  type MockPortfolioImportJob,
} from './portfolio-import-seed';

function createReportDocument(organizationId: string, jobId: string): MockDocument {
  const now = new Date().toISOString();
  const fileName = `import-report-${jobId}.csv`;
  const document: MockDocument = {
    id: nextId('document'),
    organizationId,
    objectKey: `imports/${organizationId}/${fileName}`,
    kind: 'OTHER',
    fileName,
    mimeType: 'text/csv',
    sizeBytes: 2048,
    widthPx: null,
    heightPx: null,
    pagesCount: null,
    relatedEntityType: null,
    relatedEntityId: null,
    uploadedByUserId: null,
    uploadedAt: now,
    retentionUntil: null,
    deletedAt: null,
  };
  documents.set(document.id, document);
  return document;
}

export const portfolioImportHandlers = [
  http.post(`${API_BASE}/portfolio-imports`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as { documentId: string };
    if (hasRunningImport(organizationId)) {
      return conflict(
        'IMPORTS.ALREADY_RUNNING',
        'Un import de portefeuille est déjà en cours pour cette organisation.',
      );
    }
    const now = new Date().toISOString();
    const jobId = nextId('portfolioimport');
    const report = buildDeterministicImportReport();
    const reportDocument = createReportDocument(organizationId, jobId);
    const job: MockPortfolioImportJob = {
      jobId,
      organizationId,
      documentId: body.documentId,
      status: 'DONE',
      linesRead: report.linesRead,
      linesCreated: report.linesCreated,
      linesRejected: report.linesRejected,
      rejections: report.rejections,
      reportDocumentId: reportDocument.id,
      startedAt: now,
      finishedAt: now,
    };
    portfolioImportJobs.set(jobId, job);
    return HttpResponse.json({ jobId }, { status: 202 });
  }),

  http.get(`${API_BASE}/portfolio-imports/:jobId`, ({ params }) => {
    const job = portfolioImportJobs.get(String(params.jobId));
    if (!job) return notFound('IMPORTS.JOB_NOT_FOUND');
    return HttpResponse.json(serializePortfolioImportReport(job));
  }),
];
