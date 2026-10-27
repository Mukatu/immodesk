import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import {
  assertReadOnlyTransition,
  assertReasonRequiredOnEnable,
  ReadOnlyAlreadySetError,
  type ReadOnlyState,
} from '../domain/read-only-mode';
import {
  PlatformFlagsRepository,
  type FeatureFlagRow,
} from '../infrastructure/platform-flags.repository';

const FLAG_KEY = 'read_only_mode';

export interface SetReadOnlyModeInput {
  enabled: boolean;
  reason?: string;
  expectedEndAt?: string;
  incidentRef?: string;
  actorUserId: string | null;
}

/**
 * Bascule en lecture seule (docs/api/phase11-contract.md, § 11.C).
 *
 * L'état est le drapeau GLOBAL `read_only_mode`. Sa lecture est publique
 * (policy `org_isolation`, `organization_id IS NULL` toujours visible) ; son
 * écriture passe par `PrismaService.withAdmin` — `immodesk_admin`, seul
 * habilité à modifier un drapeau global (arbitrage 2, policy
 * `global_flags_readonly`).
 *
 * Le guard transversal `503 PLATFORM.READ_ONLY`, qui bloque les écritures
 * métier pendant le gel, est posé en `APP_GUARD` hors de ce module ; ce
 * service se contente d'exposer l'état et la bascule elle-même.
 */
@Injectable()
export class ReadOnlyModeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flags: PlatformFlagsRepository,
    private readonly audit: AuditService,
    private readonly config: AppConfigService,
  ) {}

  /** Lecture publique, utilisée par `/v1/status` comme par la console d'admin. */
  async getState(): Promise<ReadOnlyState> {
    const row = await this.flags.readGlobal(this.prisma, FLAG_KEY);
    return this.toState(row);
  }

  async setState(input: SetReadOnlyModeInput): Promise<ReadOnlyState> {
    assertReasonRequiredOnEnable(input.enabled, input.reason);

    return this.prisma.withAdmin(async (admin) => {
      const current = await this.flags.readGlobal(admin, FLAG_KEY);
      try {
        assertReadOnlyTransition(current?.isEnabled ?? false, input.enabled);
      } catch (error) {
        if (error instanceof ReadOnlyAlreadySetError) {
          throw new DomainError('PLATFORM.READ_ONLY_ALREADY_SET', { requested: input.enabled });
        }
        throw error;
      }

      const now = new Date();
      const expectedEndAt = input.expectedEndAt ? new Date(input.expectedEndAt) : null;
      const updated = await this.flags.writeGlobal(admin, FLAG_KEY, {
        isEnabled: input.enabled,
        payload: input.enabled
          ? { reason: input.reason, incidentRef: input.incidentRef ?? null }
          : {},
        startsAt: input.enabled ? now : null,
        endsAt: input.enabled ? expectedEndAt : null,
        description: 'Gel des écritures métier de la plateforme (reprise d’activité, phase 11).',
      });

      const organizationIds = await this.flags.listActiveOrganizationIds(admin);
      const operation = input.enabled
        ? AUDIT_OPERATIONS.READ_ONLY_MODE_ENABLED
        : AUDIT_OPERATIONS.READ_ONLY_MODE_DISABLED;
      const newState = toJsonState({
        enabled: input.enabled,
        reason: input.reason ?? null,
        expectedEndAt: input.expectedEndAt ?? null,
        incidentRef: input.incidentRef ?? null,
      });
      await Promise.all(
        organizationIds.map((organizationId) =>
          this.audit.record(admin, {
            organizationId,
            action: 'STATE_TRANSITION',
            operation,
            entityType: 'organizations',
            entityId: organizationId,
            actorUserId: input.actorUserId,
            newState,
          }),
        ),
      );

      return this.toState(updated);
    });
  }

  private toState(row: FeatureFlagRow | null): ReadOnlyState {
    if (!row) {
      return {
        enabled: this.config.get('READ_ONLY_MODE_BOOTSTRAP'),
        reason: null,
        since: null,
        expectedEndAt: null,
        incidentRef: null,
      };
    }
    if (!row.isEnabled) {
      return { enabled: false, reason: null, since: null, expectedEndAt: null, incidentRef: null };
    }
    return {
      enabled: true,
      reason: typeof row.payload.reason === 'string' ? row.payload.reason : null,
      since: row.startsAt ? row.startsAt.toISOString() : null,
      expectedEndAt: row.endsAt ? row.endsAt.toISOString() : null,
      incidentRef: typeof row.payload.incidentRef === 'string' ? row.payload.incidentRef : null,
    };
  }
}
