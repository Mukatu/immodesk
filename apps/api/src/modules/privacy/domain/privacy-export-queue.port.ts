import type { SubjectType } from './subject';

export type PrivacyExportKind = 'organization' | 'subject';

export interface PrivacyExportJobData {
  kind: PrivacyExportKind;
  organizationId: string;
  userId: string;
  /** Uniquement pour `kind: 'subject'`. */
  subjectType?: SubjectType;
  subjectId?: string;
}

export interface PrivacyExportJobResult {
  documentId: string;
  downloadUrl: string;
  expiresAt: string;
  tableCount: number;
  rowCount: number;
}

export type PrivacyExportJobStatus = 'QUEUED' | 'ACTIVE' | 'COMPLETED' | 'FAILED';

export interface PrivacyExportJobView {
  organizationId: string;
  status: PrivacyExportJobStatus;
  result?: PrivacyExportJobResult;
  error?: string;
}

/**
 * Port de mise en file des exports de réversibilité (contrat phase 11,
 * § « Export »). MÊME construction que `reporting/domain/export-queue.port.ts`
 * (phase 9), mais file DÉDIÉE : cet agent n'a pas le droit de modifier
 * `modules/reporting` (hors de son périmètre) pour y exposer le jeton de file
 * existant, alors que le format produit (archive ZIP multi-tables + manifeste)
 * diffère entièrement du CSV unique de la phase 9. Le suivi reste néanmoins
 * strictement un `202 { jobId }` suivi d'un statut, comme le veut le contrat —
 * voir la note de fin de rapport sur ce choix.
 */
export const PRIVACY_EXPORT_QUEUE = Symbol('PRIVACY_EXPORT_QUEUE');

export interface PrivacyExportQueuePort {
  /** `jobId` TOUJOURS unique (voir `erasure-queue.port.ts` pour la même règle et sa raison). */
  enqueue(data: PrivacyExportJobData): Promise<{ jobId: string }>;
  status(jobId: string): Promise<PrivacyExportJobView | null>;
  /** Export d'ORGANISATION `waiting`/`active` déjà ouvert, s'il en existe un (contrat : un seul export concurrent). */
  findRunningOrganizationExport(organizationId: string): Promise<PrivacyExportJobView | null>;
}
