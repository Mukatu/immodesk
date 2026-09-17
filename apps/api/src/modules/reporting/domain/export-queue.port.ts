import type { ExportDashboardKind, ExportKind } from '../presentation/dto/reporting.dto';

/** Données portées par un travail d'export en file (au-delà du seuil synchrone). */
export interface ExportJobData {
  organizationId: string;
  userId: string;
  kind: ExportKind;
  fileName: string;
  filters: {
    from?: string;
    to?: string;
    asOf?: string;
    propertyId?: string;
    landlordId?: string;
    status?: string;
    method?: string;
    dashboardKind?: ExportDashboardKind;
  };
}

export interface ExportJobResult {
  documentId: string;
  downloadUrl: string;
  expiresAt: string;
  rowCount: number;
}

export type ExportJobStatus = 'QUEUED' | 'ACTIVE' | 'COMPLETED' | 'FAILED';

export interface ExportJobView {
  /** Organisation propriétaire du travail — vérifiée par `ExportsService.jobStatus`
   *  avant de rendre le résultat : un identifiant de job n'est pas un secret
   *  suffisant pour traverser les organisations (404, jamais 403). */
  organizationId: string;
  status: ExportJobStatus;
  result?: ExportJobResult;
  error?: string;
}

/**
 * Port de mise en file des exports volumineux, implémenté par
 * `infrastructure/export-worker.ts` (BullMQ). `ExportsService` en dépend par
 * INTERFACE afin d'éviter la dépendance circulaire : le worker appelle en
 * retour `ExportsService.buildAndStore` pour produire le CSV.
 */
export const EXPORT_QUEUE = Symbol('EXPORT_QUEUE');

export interface ExportQueuePort {
  enqueue(data: ExportJobData): Promise<{ jobId: string }>;
  status(jobId: string): Promise<ExportJobView | null>;
}
