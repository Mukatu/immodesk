import type { MemberRole } from '../../../shared/tenant/tenant-context';

/**
 * Enveloppe de synchronisation (docs/api/phase5-contract.md).
 *
 * Le protocole est générique : la phase 5 enregistre deux gestionnaires
 * (`CASH_RECEIPT`, `DOCUMENT`). La phase 8 en ajoutera d'autres sans toucher
 * ni à cette enveloppe, ni au moteur de rejeu (`SyncBatchesService`).
 */
export type SyncOperationType = 'CASH_RECEIPT' | 'DOCUMENT';

export const SYNC_OPERATION_TYPES: readonly SyncOperationType[] = ['CASH_RECEIPT', 'DOCUMENT'];

export interface SyncOperationInput {
  clientRef: string;
  type: SyncOperationType;
  clientCreatedAt: string;
  dependsOn?: string[];
  payload: unknown;
}

export interface SyncBatchInput {
  batchRef: string;
  deviceId: string;
  devicePlatform?: string | null;
  appVersion?: string | null;
  clientGeneratedAt?: string | null;
  offlineDurationMinutes?: number | null;
  operations: SyncOperationInput[];
}

export type SyncOperationOutcome = 'APPLIED' | 'DUPLICATE' | 'REJECTED' | 'CONFLICT' | 'SKIPPED';

export interface SyncOperationResult {
  clientRef: string;
  type: SyncOperationType;
  outcome: SyncOperationOutcome;
  resourceType?: string;
  resourceId?: string;
  code?: string;
  message?: string;
  retryable?: boolean;
}

export type SyncBatchStatus = 'APPLIED' | 'PARTIALLY_APPLIED' | 'REJECTED' | 'FAILED';

export interface SyncBatchResult {
  batchId: string;
  batchRef: string;
  status: SyncBatchStatus;
  operationsCount: number;
  appliedCount: number;
  rejectedCount: number;
  conflictsCount: number;
  receivedAt: string;
  appliedAt: string | null;
  results: SyncOperationResult[];
}

/** Lecteur minimal transmis à chaque gestionnaire d'opération. */
export interface SyncReader {
  userId: string;
  role: MemberRole;
}

/** Ligne de `GET /v1/sync/batches` (liste, filtrable par démarcheur/statut/période). */
export interface SyncBatchSummary {
  batchId: string;
  batchRef: string;
  deviceId: string;
  devicePlatform: string | null;
  appVersion: string | null;
  collectorUserId: string;
  /** Redondant avec `collectorUserId`, mais lisible sans appel supplémentaire. */
  collector: { userId: string; fullName: string };
  status: string;
  operationsCount: number;
  appliedCount: number;
  rejectedCount: number;
  conflictsCount: number;
  receivedAt: string;
  appliedAt: string | null;
}

/** `GET /v1/sync/devices` : supervision de la dernière synchronisation par appareil. */
export interface DeviceStatus {
  deviceId: string;
  devicePlatform: string | null;
  appVersion: string | null;
  collector: { userId: string; fullName: string };
  lastBatchAt: string;
  lastBatchStatus: string;
  pendingConflicts: number;
  totalApplied: number;
}

/** `GET /v1/mobile/config`. */
export interface MobileConfig {
  maxPhotoBytes: number;
  photoMaxDimension: number;
  photoQuality: number;
  maxSignatureBytes: number;
  retentionHours: number;
  syncIntervalSeconds: number;
  maxOperationsPerBatch: number;
  offlineWritesEnabled: boolean;
}

/** Codes internes au moteur, jamais levés comme `DomainError` HTTP. */
export const SYNC_INTERNAL_CODES = {
  DEPENDENCY_REJECTED: 'SYNC.DEPENDENCY_REJECTED',
  DEPENDENCY_CYCLE: 'SYNC.DEPENDENCY_CYCLE',
  OPERATION_FAILED: 'SYNC.OPERATION_FAILED',
  UNSUPPORTED_TYPE: 'SYNC.UNSUPPORTED_OPERATION_TYPE',
} as const;
