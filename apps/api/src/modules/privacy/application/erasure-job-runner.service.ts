import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { partyTableFor } from '../domain/subject';
import type { ErasureJobData, ErasureJobResult } from '../domain/erasure-queue.port';
import { EligibilityService } from './eligibility.service';
import { ErasureExecutionService } from './erasure-execution.service';
import { ErasureSideEffectsService } from './erasure-side-effects.service';
import { privacySettingsFor } from './privacy-defaults';

/**
 * Corps de `infrastructure/erasure-worker.ts` : rejoue la recevabilité (l'état
 * a pu changer depuis la demande) puis exécute. Séparé d'`ErasureService`
 * (au-delà de 180 lignes réunis) — et sans dépendre de lui, ce qui évite tout
 * `forwardRef` côté worker.
 */
@Injectable()
export class ErasureJobRunnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly auditService: AuditService,
    private readonly eligibility: EligibilityService,
    private readonly execution: ErasureExecutionService,
    private readonly sideEffects: ErasureSideEffectsService,
  ) {}

  async run(data: ErasureJobData): Promise<ErasureJobResult> {
    return this.prisma.withTenant(data.organizationId, data.actorUserId, async (tx) => {
      const identityMonths = (await privacySettingsFor(tx, data.organizationId, this.config))
        .identityMonths;
      const verdict = await this.eligibility.evaluate(
        tx,
        data.subjectType,
        data.subjectId,
        identityMonths,
      );
      if (!verdict.eligible) {
        throw new DomainError('PRIVACY.ERASURE_NOT_ELIGIBLE', {
          blockingReasons: verdict.blockingReasons,
        });
      }

      const reserved = {
        name: this.config.get('PRIVACY_ANONYMIZED_NAME'),
        phone: this.config.get('PRIVACY_ANONYMIZED_PHONE'),
      };
      const before = await this.sideEffects.financialTotals(tx, data.subjectType, data.subjectId);
      const outcome = await this.execution.execute(tx, data.subjectType, data.subjectId, reserved);
      const after = await this.sideEffects.financialTotals(tx, data.subjectType, data.subjectId);
      const financialTotalsUnchanged =
        before.amount === after.amount && before.receiptsCount === after.receiptsCount;

      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.PRIVACY_ERASURE_EXECUTED,
        entityType: partyTableFor(data.subjectType) ?? 'users',
        entityId: data.subjectId,
        newState: toJsonState({ ...outcome, financialTotalsUnchanged }),
      });

      return { ...outcome, financialTotalsUnchanged, executedAt: new Date().toISOString() };
    });
  }
}
