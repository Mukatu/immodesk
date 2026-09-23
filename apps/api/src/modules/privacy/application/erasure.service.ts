import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { assertErasableSubject, partyTableFor, type SubjectType } from '../domain/subject';
import { ERASURE_QUEUE, type ErasureQueuePort } from '../domain/erasure-queue.port';
import { EligibilityService } from './eligibility.service';
import { ErasurePreviewService, type ErasureCounts } from './erasure-preview.service';
import { privacySettingsFor } from './privacy-defaults';

export interface ErasurePreviewView extends ErasureCounts {
  subjectType: SubjectType;
  subjectId: string;
  eligible: boolean;
  blockingReasons: string[];
}

export interface ErasureReportView extends ErasureCounts {
  subjectType: SubjectType;
  subjectId: string;
  eligible: boolean;
  blockingReasons: string[];
  jobId: string;
  status: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED';
  executedAt: string | null;
  financialTotalsUnchanged: boolean;
  error: string | null;
}

/**
 * Façade des trois routes d'effacement (préview, demande, rapport). L'exécution
 * elle-même (`buildAndExecute`) vit dans `ErasureJobRunnerService`, appelée
 * DIRECTEMENT par `infrastructure/erasure-worker.ts` — sans passer par cette
 * classe, pour rester sous 180 lignes et éviter un `forwardRef` de plus.
 */
@Injectable()
export class ErasureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly auditService: AuditService,
    private readonly eligibility: EligibilityService,
    private readonly preview: ErasurePreviewService,
    @Inject(ERASURE_QUEUE) private readonly queue: ErasureQueuePort,
  ) {}

  /** `POST /v1/privacy/erasure-requests/preview` : ne modifie rien. */
  async simulate(
    organizationId: string,
    userId: string,
    subjectType: string,
    subjectId: string,
  ): Promise<ErasurePreviewView> {
    const validated = assertErasableSubject(subjectType);
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const identityMonths = (await privacySettingsFor(tx, organizationId, this.config))
        .identityMonths;
      const verdict = await this.eligibility.evaluate(tx, validated, subjectId, identityMonths);
      const reserved = {
        name: this.config.get('PRIVACY_ANONYMIZED_NAME'),
        phone: this.config.get('PRIVACY_ANONYMIZED_PHONE'),
      };
      const counts = await this.preview.count(tx, validated, subjectId, reserved);
      return {
        subjectType: validated,
        subjectId,
        eligible: verdict.eligible,
        blockingReasons: verdict.blockingReasons,
        ...counts,
      };
    });
  }

  /** `POST /v1/privacy/erasure-requests` : recevabilité vérifiée AVANT toute écriture (contrat § Effacement). */
  async request(
    organizationId: string,
    userId: string,
    subjectType: string,
    subjectId: string,
  ): Promise<{ jobId: string }> {
    const validated = assertErasableSubject(subjectType);

    const running = await this.queue.findRunning(organizationId, validated, subjectId);
    if (running) {
      throw new DomainError('PRIVACY.ERASURE_ALREADY_RUNNING', {
        subjectType: validated,
        subjectId,
      });
    }

    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const identityMonths = (await privacySettingsFor(tx, organizationId, this.config))
        .identityMonths;
      const verdict = await this.eligibility.evaluate(tx, validated, subjectId, identityMonths);
      if (!verdict.eligible) {
        await audit(this.auditService, tx, {
          action: 'STATE_TRANSITION',
          operation: AUDIT_OPERATIONS.PRIVACY_ERASURE_REFUSED,
          entityType: partyTableFor(validated) ?? 'users',
          entityId: subjectId,
          newState: toJsonState({
            subjectType: validated,
            blockingReasons: verdict.blockingReasons,
          }),
        });
        throw new DomainError('PRIVACY.ERASURE_NOT_ELIGIBLE', {
          blockingReasons: verdict.blockingReasons,
        });
      }

      const { jobId } = await this.queue.enqueue({
        organizationId,
        actorUserId: userId,
        subjectType: validated,
        subjectId,
      });
      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.PRIVACY_ERASURE_REQUESTED,
        entityType: partyTableFor(validated) ?? 'users',
        entityId: subjectId,
        newState: toJsonState({ subjectType: validated, jobId }),
      });
      return { jobId };
    });
  }

  /** `GET /v1/privacy/erasure-requests/{jobId}` : rapport, pas un fichier (arbitrage 17). */
  async report(organizationId: string, jobId: string): Promise<ErasureReportView> {
    const view = await this.queue.status(jobId);
    if (!view || view.organizationId !== organizationId) {
      throw new DomainError('PLATFORM.NOT_FOUND', { resource: 'erasure-job', jobId });
    }
    const status =
      view.status === 'QUEUED'
        ? 'QUEUED'
        : view.status === 'ACTIVE'
          ? 'RUNNING'
          : view.status === 'COMPLETED'
            ? 'DONE'
            : 'FAILED';
    const result = view.result;
    return {
      subjectType: view.subjectType,
      subjectId: view.subjectId,
      eligible: status !== 'FAILED',
      blockingReasons: [],
      jobId,
      status,
      executedAt: result?.executedAt ?? null,
      financialTotalsUnchanged: result?.financialTotalsUnchanged ?? true,
      error: view.error ?? null,
      anonymized: result?.anonymized ?? [],
      deleted: result?.deleted ?? [],
      preserved: result?.preserved ?? [],
    };
  }
}
