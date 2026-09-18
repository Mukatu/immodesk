import type {
  PortfolioImportEntityType,
  PortfolioImportRejection,
  PortfolioImportStatus,
} from '@/lib/api/types';

/**
 * Mock MSW — Phase 10, état des jobs d'import de portefeuille. Arbitrage n°3
 * du contrat : aucune table dédiée n'existe en base, le job emprunte donc
 * exactement le mécanisme des exports de la phase 9 (voir exports-handlers.ts)
 * et ne vit qu'ici, en mémoire, isolé de handlers.ts comme les autres fichiers
 * `*-seed.ts`.
 */
export interface MockPortfolioImportJob {
  jobId: string;
  organizationId: string;
  documentId: string;
  status: PortfolioImportStatus;
  linesRead: number;
  linesCreated: number;
  linesRejected: number;
  rejections: PortfolioImportRejection[];
  reportDocumentId: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export const portfolioImportJobs = new Map<string, MockPortfolioImportJob>();

/** 409 `IMPORTS.ALREADY_RUNNING` : deux imports simultanés sur la même organisation sont refusés. */
export function hasRunningImport(organizationId: string): boolean {
  return [...portfolioImportJobs.values()].some(
    (job) =>
      job.organizationId === organizationId &&
      (job.status === 'QUEUED' || job.status === 'RUNNING'),
  );
}

/**
 * Rapport déterministe et plausible (pas de vrai parsing CSV) : quelques
 * lignes rejetées, motivées en français, réparties sur les types d'entité du
 * format attendu (bailleurs, biens, lots, locataires, baux). Conforme au
 * critère « transactionnel par ligne » : une ligne fautive n'interrompt
 * jamais l'import, elle est comptée et motivée.
 */
const DEMO_REJECTIONS: { entityType: PortfolioImportEntityType; reason: string }[] = [
  { entityType: 'PROPERTY', reason: "Adresse manquante pour l'immeuble." },
  { entityType: 'UNIT', reason: 'Référence locale de bien introuvable dans le fichier.' },
  { entityType: 'TENANT', reason: 'Numéro de téléphone principal invalide.' },
  { entityType: 'LEASE', reason: 'Montant du loyer manquant ou non numérique.' },
];

export function buildDeterministicImportReport(): {
  linesRead: number;
  linesCreated: number;
  linesRejected: number;
  rejections: PortfolioImportRejection[];
} {
  const rejections: PortfolioImportRejection[] = DEMO_REJECTIONS.map((r, index) => ({
    line: 8 + index * 11,
    entityType: r.entityType,
    reason: r.reason,
  }));
  const linesRead = 42;
  const linesRejected = rejections.length;
  return { linesRead, linesCreated: linesRead - linesRejected, linesRejected, rejections };
}

export function serializePortfolioImportReport(job: MockPortfolioImportJob) {
  const { organizationId: _organizationId, ...rest } = job;
  return rest;
}
