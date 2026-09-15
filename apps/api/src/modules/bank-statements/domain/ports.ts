import type { TenantClient } from '../../../shared/prisma/prisma.service';

export const RECONCILIATION_ENGINE = Symbol('RECONCILIATION_ENGINE');

export interface ReconciliationRunResult {
  matched: number;
  suggested: number;
  unmatched: number;
  receiptIds: readonly string[];
}

export interface ReconciliationEngine {
  runForStatement(
    tx: TenantClient,
    input: {
      organizationId: string;
      statementId: string;
      actorUserId: string | null;
      today: Date;
    },
  ): Promise<ReconciliationRunResult>;

  scheduleAfterCommit(organizationId: string, result: ReconciliationRunResult): Promise<void>;
}
