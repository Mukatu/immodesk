import type { SubjectType } from './subject';
import type {
  AnonymizedCount,
  PreservedCount,
  TableCount,
} from '../application/erasure-execution.service';

export interface ErasureJobData {
  organizationId: string;
  actorUserId: string;
  subjectType: Exclude<SubjectType, 'user'>;
  subjectId: string;
}

export interface ErasureJobResult {
  alreadyAnonymized: boolean;
  anonymized: AnonymizedCount[];
  deleted: TableCount[];
  preserved: PreservedCount[];
  financialTotalsUnchanged: boolean;
  executedAt: string;
}

export type ErasureJobStatus = 'QUEUED' | 'ACTIVE' | 'COMPLETED' | 'FAILED';

export interface ErasureJobView {
  organizationId: string;
  subjectType: Exclude<SubjectType, 'user'>;
  subjectId: string;
  status: ErasureJobStatus;
  result?: ErasureJobResult;
  error?: string;
}

/**
 * Port de mise en file de l'exécution d'un effacement, implémenté par
 * `infrastructure/erasure-worker.ts` (BullMQ). Même construction que
 * `reporting/domain/export-queue.port.ts` (phase 9) : `ErasureService` en
 * dépend par INTERFACE, le worker appelle en retour son
 * `buildAndExecute` pour éviter la dépendance circulaire.
 *
 * `enqueue` attribue un `jobId` UNIQUE à chaque appel (jamais déterministe) :
 * un identifiant réutilisé heurterait un job déjà `COMPLETED`/`FAILED` encore
 * en rétention BullMQ (`removeOnComplete`/`removeOnFail`, 24 h) — `Queue.add`
 * y renverrait alors ce VIEUX job sans en rejouer aucun, un `202` mentirait
 * silencieusement. La détection d'un effacement déjà en cours passe donc par
 * `findRunning`, qui parcourt les jobs `waiting`/`active` de la file — ce
 * n'est qu'à cette étape que le tiers visé compte, pas à l'identifiant du job.
 */
export const ERASURE_QUEUE = Symbol('ERASURE_QUEUE');

export interface ErasureQueuePort {
  enqueue(data: ErasureJobData): Promise<{ jobId: string }>;
  status(jobId: string): Promise<ErasureJobView | null>;
  /** Job `waiting`/`active` déjà ouvert pour CE tiers, s'il en existe un. */
  findRunning(
    organizationId: string,
    subjectType: Exclude<SubjectType, 'user'>,
    subjectId: string,
  ): Promise<ErasureJobView | null>;
}
