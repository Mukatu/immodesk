import { Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import {
  appendIncidentUpdate,
  declareIncident,
  IncidentAlreadyOpenError,
  IncidentNotFoundError,
  assertNoOpenIncident,
  resolveIncident,
  type IncidentPayload,
  type IncidentSeverity,
} from '../domain/incident';
import { PlatformFlagsRepository } from '../infrastructure/platform-flags.repository';

const FLAG_KEY = 'platform_incident';

/**
 * Incidents de plateforme (docs/api/phase11-contract.md, § 11.F). État
 * porté par le drapeau GLOBAL `platform_incident` ; écritures sous
 * `immodesk_admin` (arbitrage 2). La déclaration et la résolution sont
 * diffusées dans `audit_logs` de toutes les organisations ACTIVES
 * (arbitrage 4) ; les mises à jour intermédiaires ne le sont PAS.
 */
@Injectable()
export class IncidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flags: PlatformFlagsRepository,
    private readonly audit: AuditService,
  ) {}

  async getCurrent(): Promise<IncidentPayload | null> {
    const row = await this.flags.readGlobal(this.prisma, FLAG_KEY);
    return row && row.isEnabled ? (row.payload as unknown as IncidentPayload) : null;
  }

  async declare(input: {
    title: string;
    severity: IncidentSeverity;
    actorUserId: string | null;
  }): Promise<IncidentPayload> {
    return this.prisma.withAdmin(async (admin) => {
      const row = await this.flags.readGlobal(admin, FLAG_KEY);
      const current = row && row.isEnabled ? (row.payload as unknown as IncidentPayload) : null;
      try {
        assertNoOpenIncident(current);
      } catch (error) {
        if (error instanceof IncidentAlreadyOpenError) {
          throw new DomainError('PLATFORM.INCIDENT_ALREADY_OPEN');
        }
        throw error;
      }

      const now = new Date();
      const incident = declareIncident({
        reference: `INC-${now.getTime().toString(36).toUpperCase()}`,
        title: input.title,
        severity: input.severity,
        startedAt: now,
      });
      await this.flags.writeGlobal(admin, FLAG_KEY, {
        isEnabled: true,
        payload: incident as unknown as Record<string, unknown>,
        startsAt: now,
        endsAt: null,
        description: 'Incident de plateforme en cours (phase 11).',
      });
      await this.broadcast(admin, AUDIT_OPERATIONS.INCIDENT_DECLARED, incident, input.actorUserId);
      return incident;
    });
  }

  /** Mise à jour intermédiaire : jamais diffusée en audit (arbitrage 4). */
  async addUpdate(input: {
    message: string;
    actorUserId: string | null;
  }): Promise<IncidentPayload> {
    return this.prisma.withAdmin(async (admin) => {
      const row = await this.flags.readGlobal(admin, FLAG_KEY);
      const current = row && row.isEnabled ? (row.payload as unknown as IncidentPayload) : null;
      const updated = this.transition(() =>
        appendIncidentUpdate(current, input.message, new Date()),
      );
      await this.flags.writeGlobal(admin, FLAG_KEY, {
        payload: updated as unknown as Record<string, unknown>,
      });
      return updated;
    });
  }

  async resolve(input: { actorUserId: string | null }): Promise<IncidentPayload> {
    return this.prisma.withAdmin(async (admin) => {
      const row = await this.flags.readGlobal(admin, FLAG_KEY);
      const current = row && row.isEnabled ? (row.payload as unknown as IncidentPayload) : null;
      const resolved = this.transition(() => resolveIncident(current, new Date()));
      await this.flags.writeGlobal(admin, FLAG_KEY, {
        isEnabled: false,
        payload: resolved as unknown as Record<string, unknown>,
        endsAt: new Date(),
      });
      await this.broadcast(admin, AUDIT_OPERATIONS.INCIDENT_RESOLVED, resolved, input.actorUserId);
      return resolved;
    });
  }

  private transition(fn: () => IncidentPayload): IncidentPayload {
    try {
      return fn();
    } catch (error) {
      if (error instanceof IncidentNotFoundError) {
        throw new DomainError('PLATFORM.INCIDENT_NOT_FOUND');
      }
      throw error;
    }
  }

  private async broadcast(
    admin: PrismaClient,
    operation: string,
    incident: IncidentPayload,
    actorUserId: string | null,
  ): Promise<void> {
    const organizationIds = await this.flags.listActiveOrganizationIds(admin);
    const newState = toJsonState(incident as unknown as Record<string, unknown>);
    await Promise.all(
      organizationIds.map((organizationId) =>
        this.audit.record(admin, {
          organizationId,
          action: 'STATE_TRANSITION',
          operation,
          entityType: 'organizations',
          entityId: organizationId,
          actorUserId,
          newState,
        }),
      ),
    );
  }
}
