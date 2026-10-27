import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { buildPage, clampLimit, decodeCursor } from '../../../shared/pagination/cursor';
import { normalizePhoneE164 } from '../../../shared/phone/e164';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { AuditService } from '../../audit/application/audit.service';
import { NOTIFICATION_ENQUEUER, type NotificationEnqueuer } from '../../notifications/domain/ports';
import { MESSAGE_TEMPLATE_CODES } from '../../notifications/domain/template-codes';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import {
  assertWaveKnown,
  assertWaveSize,
  evaluateGoLiveStatus,
  WaveTooLargeError,
  WaveUnknownError,
  type GoLiveOrgStatus,
} from '../domain/go-live-wave';
import { PlatformFlagsRepository } from '../infrastructure/platform-flags.repository';

const COMMERCIAL_LAUNCH_KEY = 'commercial_launch';
const SECURITY_CLEARANCE_KEY = 'security_audit_cleared';
const DENIAL_WINDOW_HOURS = 24;

export interface GoLiveBoardItem {
  organizationId: string;
  legalName: string;
  wave: string | null;
  status: GoLiveOrgStatus;
  activatedAt: string | null;
  subscriptionStatus: string | null;
  anomalies: string[];
}

export interface GoLiveBoard {
  wave: string | null;
  counts: { migrated: number; pending: number; anomaly: number };
  items: GoLiveBoardItem[];
  pageInfo: { nextCursor: string | null; hasNextPage: boolean; limit: number };
}

/**
 * Plan de go-live par vagues (docs/api/phase11-contract.md, § 11.F,
 * arbitrages 15 et 18). Aucune table de vague : `feature_flags.payload.wave`
 * sur la ligne `commercial_launch` de chaque organisation. Tout est lu et
 * écrit sous `immodesk_admin` (arbitrage 2) — ces routes ne portent pas
 * `X-Organization-Id`.
 */
@Injectable()
export class GoLiveService {
  private readonly logger = new Logger(GoLiveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly flags: PlatformFlagsRepository,
    private readonly audit: AuditService,
    private readonly config: AppConfigService,
    // Optionnel : le pipeline de notification n est pas branche dans tous les
    // contextes (tests unitaires notamment), et une vague doit pouvoir
    // s activer sans lui.
    @Optional()
    @Inject(NOTIFICATION_ENQUEUER)
    private readonly enqueuer: NotificationEnqueuer | null = null,
  ) {}

  async activateWave(
    wave: string,
    organizationIds: string[],
    actorUserId: string | null,
  ): Promise<{ wave: string; activated: number; skipped: number; notified: number }> {
    return this.prisma.withAdmin(async (admin) => {
      const clearance = await this.flags.readGlobal(admin, SECURITY_CLEARANCE_KEY);
      if (!clearance?.isEnabled) {
        throw new DomainError('PLATFORM.SECURITY_CLEARANCE_MISSING');
      }

      const existingWaveRows = await admin.feature_flags.findMany({
        where: { key: COMMERCIAL_LAUNCH_KEY, organization_id: { not: null } },
        select: { organization_id: true, payload: true, is_enabled: true },
      });
      const alreadyTagged = existingWaveRows.filter(
        (r) => (r.payload as Record<string, unknown>)?.wave === wave,
      );

      try {
        assertWaveKnown(wave, alreadyTagged.length, organizationIds.length);
      } catch (error) {
        if (error instanceof WaveUnknownError) {
          throw new DomainError('PLATFORM.WAVE_UNKNOWN', { wave });
        }
        throw error;
      }

      const targetIds = new Set([
        ...alreadyTagged.map((r) => r.organization_id as string),
        ...organizationIds,
      ]);
      try {
        assertWaveSize(targetIds.size, this.config.get('GO_LIVE_WAVE_MAX_ORGANIZATIONS'));
      } catch (error) {
        if (error instanceof WaveTooLargeError) {
          throw new DomainError('PLATFORM.WAVE_TOO_LARGE', {
            count: targetIds.size,
            max: error.max,
          });
        }
        throw error;
      }

      const alreadyEnabled = new Set(
        existingWaveRows.filter((r) => r.is_enabled).map((r) => r.organization_id as string),
      );
      const now = new Date();
      const activatedIds: string[] = [];
      let activated = 0;
      let skipped = 0;
      for (const organizationId of targetIds) {
        if (alreadyEnabled.has(organizationId)) {
          skipped += 1;
          continue;
        }
        const updated = await this.flags.writeForOrganization(
          admin,
          COMMERCIAL_LAUNCH_KEY,
          organizationId,
          {
            isEnabled: true,
            payload: { wave },
            startsAt: now,
          },
        );
        activated += 1;
        activatedIds.push(organizationId);
        await this.audit.record(admin, {
          organizationId,
          action: 'STATE_TRANSITION',
          operation: AUDIT_OPERATIONS.GO_LIVE_WAVE_ACTIVATED,
          entityType: 'organizations',
          entityId: organizationId,
          actorUserId,
          newState: toJsonState({ wave, flagId: updated.id, startsAt: now.toISOString() }),
        });
      }

      const notified = await this.notifyManagers(wave, activatedIds);
      return { wave, activated, skipped, notified };
    });
  }

  /**
   * Prévient les responsables des organisations qui viennent d'être activées
   * (contrat, § « Vagues » : « Chaque MANAGER des organisations retenues
   * reçoit une notification par le pipeline existant »).
   *
   * DEUX ÉCARTS ASSUMÉS, tous deux documentés plutôt que silencieux.
   * 1. Les `OWNER` sont prévenus en plus des `MANAGER` : une agence
   *    indépendante n'a souvent aucun `MANAGER`, et s'en tenir à la lettre du
   *    contrat reviendrait à n'avertir personne dans le cas le plus fréquent.
   * 2. La remise est SMS seule, et non « WhatsApp puis SMS » : le modèle
   *    WhatsApp exige une approbation Meta que le compte WhatsApp Business,
   *    pas encore ouvert, ne permet pas d'obtenir. Voir le commentaire du
   *    modèle dans `notifications/domain/template-catalog.ts`.
   *
   * BEST-EFFORT : un échec d'envoi ne doit jamais faire échouer l'activation
   * d'une vague, qui est déjà écrite et auditée à ce stade. Le compte rendu
   * renvoie le nombre réellement mis en file.
   */
  private async notifyManagers(wave: string, organizationIds: string[]): Promise<number> {
    if (!this.enqueuer || organizationIds.length === 0) return 0;

    let notified = 0;
    for (const organizationId of organizationIds) {
      try {
        const rows = await this.prisma.withTenant(organizationId, null, (tx) =>
          tx.$queryRawUnsafe<Array<{ phone: string; organization_name: string }>>(
            `SELECT u.phone_e164 AS phone,
                    coalesce(o.trade_name, o.legal_name) AS organization_name
               FROM organization_members om
               JOIN users u ON u.id = om.user_id
               JOIN organizations o ON o.id = om.organization_id
              WHERE om.organization_id = $1::uuid
                AND om.role IN ('OWNER', 'MANAGER')
                AND om.status = 'ACTIVE'`,
            organizationId,
          ),
        );

        for (const row of rows) {
          await this.enqueuer.enqueue({
            organizationId,
            templateCode: MESSAGE_TEMPLATE_CODES.GO_LIVE_ACTIVATED,
            channelOrder: ['SMS'],
            recipient: { phone: normalizePhoneE164(row.phone), userId: null },
            variables: { organizationName: row.organization_name, wave },
          });
          notified += 1;
        }
      } catch (error) {
        this.logger.warn(
          `Notification de mise en service non remise pour ${organizationId} : ${(error as Error).message}`,
        );
      }
    }
    return notified;
  }

  async rollbackWave(
    wave: string,
    actorUserId: string | null,
  ): Promise<{ wave: string; reverted: number }> {
    return this.prisma.withAdmin(async (admin) => {
      const rows = await admin.feature_flags.findMany({
        where: { key: COMMERCIAL_LAUNCH_KEY, organization_id: { not: null }, is_enabled: true },
        select: { id: true, organization_id: true, payload: true },
      });
      const targets = rows.filter((r) => (r.payload as Record<string, unknown>)?.wave === wave);
      if (targets.length === 0) {
        throw new DomainError('PLATFORM.WAVE_UNKNOWN', { wave });
      }

      for (const row of targets) {
        await admin.feature_flags.update({ where: { id: row.id }, data: { is_enabled: false } });
        await this.audit.record(admin, {
          organizationId: row.organization_id as string,
          action: 'STATE_TRANSITION',
          operation: AUDIT_OPERATIONS.GO_LIVE_WAVE_ROLLED_BACK,
          entityType: 'organizations',
          entityId: row.organization_id as string,
          actorUserId,
          newState: toJsonState({ wave }),
        });
      }
      return { wave, reverted: targets.length };
    });
  }

  async board(query: {
    wave?: string;
    status?: GoLiveOrgStatus;
    limit?: number;
    cursor?: string;
  }): Promise<GoLiveBoard> {
    const limit = clampLimit(query.limit);
    const secret = this.config.get('CURSOR_SECRET');
    const before = query.cursor ? decodeCursor(query.cursor, secret) : undefined;

    return this.prisma.withAdmin(async (admin) => {
      const flagRows = await admin.feature_flags.findMany({
        where: { key: COMMERCIAL_LAUNCH_KEY, organization_id: { not: null } },
        select: {
          organization_id: true,
          is_enabled: true,
          starts_at: true,
          ends_at: true,
          payload: true,
        },
      });
      const byOrg = new Map(flagRows.map((r) => [r.organization_id as string, r]));
      let orgIds = flagRows.map((r) => r.organization_id as string);
      if (query.wave) {
        orgIds = flagRows
          .filter((r) => (r.payload as Record<string, unknown>)?.wave === query.wave)
          .map((r) => r.organization_id as string);
        if (orgIds.length === 0)
          throw new DomainError('PLATFORM.WAVE_UNKNOWN', { wave: query.wave });
      }
      if (orgIds.length === 0) {
        return {
          wave: query.wave ?? null,
          counts: { migrated: 0, pending: 0, anomaly: 0 },
          items: [],
          pageInfo: { nextCursor: null, hasNextPage: false, limit },
        };
      }

      const [organizations, subscriptions, denialCounts] = await Promise.all([
        admin.organizations.findMany({
          where: { id: { in: orgIds } },
          select: { id: true, legal_name: true, trade_name: true, created_at: true },
        }),
        admin.subscriptions.findMany({
          where: { organization_id: { in: orgIds } },
          select: { organization_id: true, status: true },
        }),
        admin.audit_logs.groupBy({
          by: ['organization_id'],
          where: {
            organization_id: { in: orgIds },
            reason: AUDIT_OPERATIONS.ACCESS_DENIED,
            occurred_at: { gte: new Date(Date.now() - DENIAL_WINDOW_HOURS * 3_600_000) },
          },
          _count: { _all: true },
        }),
      ]);
      const subscriptionByOrg = new Map(
        subscriptions.map((s) => [s.organization_id, s.status as string]),
      );
      const denialsByOrg = new Map(denialCounts.map((d) => [d.organization_id, d._count._all]));
      const now = new Date();

      const evaluated = organizations.map((org) => {
        const flag = byOrg.get(org.id);
        const evaluation = evaluateGoLiveStatus({
          flagEnabled: flag?.is_enabled ?? false,
          startsAt: flag?.starts_at ?? null,
          endsAt: flag?.ends_at ?? null,
          now,
          subscriptionStatus: subscriptionByOrg.get(org.id) ?? null,
          denialsLast24h: denialsByOrg.get(org.id) ?? 0,
          denialThreshold: this.config.get('GO_LIVE_ANOMALY_DENIALS_PER_DAY'),
          // Non évalués faute de contrat de données clair (voir rapport) :
          // ne déclenchent jamais d'anomalie à eux seuls.
          messageFailureRate: null,
          messageFailureThreshold: 1,
          onboardingComplete: true,
        });
        const item: GoLiveBoardItem & { created_at: Date; id: string } = {
          id: org.id,
          created_at: org.created_at,
          organizationId: org.id,
          legalName: org.trade_name ?? org.legal_name,
          wave:
            ((flag?.payload as Record<string, unknown> | undefined)?.wave as
              string | null | undefined) ?? null,
          status: evaluation.status,
          activatedAt: flag?.starts_at ? flag.starts_at.toISOString() : null,
          subscriptionStatus: subscriptionByOrg.get(org.id) ?? null,
          anomalies: evaluation.anomalies,
        };
        return item;
      });

      const filtered = query.status
        ? evaluated.filter((i) => i.status === query.status)
        : evaluated;
      const sorted = filtered.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      const startIndex = before
        ? sorted.findIndex(
            (i) =>
              i.created_at.toISOString() < before.createdAt ||
              (i.created_at.toISOString() === before.createdAt && i.id < before.id),
          )
        : 0;
      const page = sorted.slice(Math.max(startIndex, 0), Math.max(startIndex, 0) + limit + 1);
      const pageResult = buildPage(page, limit, secret);

      const counts = { migrated: 0, pending: 0, anomaly: 0 };
      for (const item of evaluated) {
        if (item.status === 'MIGRATED') counts.migrated += 1;
        else if (item.status === 'PENDING') counts.pending += 1;
        else counts.anomaly += 1;
      }

      return {
        wave: query.wave ?? null,
        counts,
        items: pageResult.items,
        pageInfo: pageResult.pageInfo,
      };
    });
  }
}
