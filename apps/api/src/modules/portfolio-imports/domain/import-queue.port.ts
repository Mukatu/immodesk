/** Données portées par un travail d'import en file. */
export interface ImportJobData {
  organizationId: string;
  userId: string;
  documentId: string;
}

export interface ImportRejectionView {
  line: number;
  reason: string;
}

export interface ImportJobResult {
  totalRows: number;
  createdCount: number;
  rejectedCount: number;
  rejected: ImportRejectionView[];
  documentId: string;
  downloadUrl: string;
  expiresAt: string;
}

export type ImportJobStatus = 'QUEUED' | 'ACTIVE' | 'COMPLETED' | 'FAILED';

export interface ImportJobView {
  /** Organisation propriétaire du travail — vérifiée avant de rendre le
   *  résultat : un identifiant de job d'une autre organisation est traité
   *  comme introuvable (404, jamais 403), même convention que les exports. */
  organizationId: string;
  status: ImportJobStatus;
  result?: ImportJobResult;
  error?: string;
}

/**
 * Port de mise en file de l'import de portefeuille, implémenté par
 * `infrastructure/import-worker.ts` (BullMQ), sur le MÊME schéma que
 * `reporting/domain/export-queue.port.ts` (contrat, arbitrage n°3 : « reprend
 * EXACTEMENT le mécanisme des exports »). `PortfolioImportsService` en dépend
 * par INTERFACE pour éviter le cycle A → jeton → B → A.
 */
export const IMPORT_QUEUE = Symbol('IMPORT_QUEUE');

export interface ImportQueuePort {
  /** Un seul import actif par organisation (409 `IMPORTS.ALREADY_RUNNING`). */
  hasRunning(organizationId: string): Promise<boolean>;
  enqueue(data: ImportJobData): Promise<{ jobId: string }>;
  status(jobId: string): Promise<ImportJobView | null>;
}
