import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { IncidentPayload } from '../domain/incident';
import { PlatformFlagsRepository } from '../infrastructure/platform-flags.repository';
import { IncidentsService } from './incidents.service';
import { ReadinessService } from './readiness.service';
import { ReadOnlyModeService } from './read-only-mode.service';

export interface PlatformStatusReport {
  status: 'ok' | 'degraded' | 'down';
  readOnly: Awaited<ReturnType<ReadOnlyModeService['getState']>>;
  checks: { database: string; redis: string; storage: string; mobileMoney: string };
  incident: IncidentPayload | null;
  plannedMaintenance: { startsAt: string; endsAt: string; message: string } | null;
}

const MAINTENANCE_KEY = 'platform_maintenance';

/**
 * `GET /v1/status` — public, sans authentification (docs/api/phase11-contract.md,
 * § 11.F). Source du bandeau permanent (`readOnly`) : combine les sondes de
 * disponibilité, l'état de lecture seule, l'incident courant et la
 * maintenance annoncée. Ne nomme aucune organisation, aucun tiers, aucun
 * dénombrement métier.
 */
@Injectable()
export class StatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flags: PlatformFlagsRepository,
    private readonly readiness: ReadinessService,
    private readonly readOnlyMode: ReadOnlyModeService,
    private readonly incidents: IncidentsService,
  ) {}

  async get(): Promise<PlatformStatusReport> {
    const [readiness, readOnly, incident, maintenanceRow] = await Promise.all([
      this.readiness.check(),
      this.readOnlyMode.getState(),
      this.incidents.getCurrent(),
      this.flags.readGlobal(this.prisma, MAINTENANCE_KEY),
    ]);

    const plannedMaintenance =
      maintenanceRow && maintenanceRow.isEnabled && maintenanceRow.startsAt && maintenanceRow.endsAt
        ? {
            startsAt: maintenanceRow.startsAt.toISOString(),
            endsAt: maintenanceRow.endsAt.toISOString(),
            message:
              typeof maintenanceRow.payload.message === 'string'
                ? maintenanceRow.payload.message
                : '',
          }
        : null;

    return {
      status: readiness.status === 'degraded' ? 'degraded' : 'ok',
      readOnly,
      checks: {
        database: readiness.checks.database.status,
        redis: readiness.checks.redis.status,
        storage: readiness.checks.storage.status,
        mobileMoney: readiness.checks.mobileMoney.status,
      },
      incident,
      plannedMaintenance,
    };
  }
}
