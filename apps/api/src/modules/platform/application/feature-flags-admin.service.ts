import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { buildPage, clampLimit, decodeCursor, type Page } from '../../../shared/pagination/cursor';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { isKnownPlatformFlagKey } from '../domain/feature-flag-keys';
import {
  PlatformFlagsRepository,
  type FeatureFlagRow,
} from '../infrastructure/platform-flags.repository';

export interface FeatureFlagDto {
  id: string;
  key: string;
  organizationId: string | null;
  isEnabled: boolean;
  rolloutPercentage: number;
  payload: Record<string, unknown>;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
}

export interface UpdateFeatureFlagInput {
  key: string;
  organizationId?: string;
  isEnabled?: boolean;
  rolloutPercentage?: number;
  payload?: Record<string, unknown>;
  startsAt?: string;
  endsAt?: string;
  actorUserId: string | null;
}

function toDto(row: FeatureFlagRow): FeatureFlagDto {
  return {
    id: row.id,
    key: row.key,
    organizationId: row.organizationId,
    isEnabled: row.isEnabled,
    rolloutPercentage: row.rolloutPercentage,
    payload: row.payload,
    startsAt: row.startsAt ? row.startsAt.toISOString() : null,
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Console de drapeaux (`GET/POST /v1/admin/feature-flags*`, contrat phase 11).
 * Lectures et écritures sous `immodesk_admin` (arbitrage 2) : aucune de ces
 * routes ne porte `X-Organization-Id`, donc `org_isolation` réduirait à zéro
 * ligne toute lecture d'un drapeau propre à une organisation.
 */
@Injectable()
export class FeatureFlagsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flags: PlatformFlagsRepository,
    private readonly audit: AuditService,
    private readonly config: AppConfigService,
  ) {}

  async list(query: {
    key?: string;
    organizationId?: string;
    limit?: number;
    cursor?: string;
  }): Promise<Page<FeatureFlagDto & { id: string; created_at: Date }>> {
    const limit = clampLimit(query.limit);
    const secret = this.config.get('CURSOR_SECRET');
    const before = query.cursor ? decodeCursor(query.cursor, secret) : undefined;

    return this.prisma.withAdmin(async (admin) => {
      const rows = await this.flags.list(
        admin,
        { key: query.key, organizationId: query.organizationId },
        {
          take: limit + 1,
          before: before ? { createdAt: new Date(before.createdAt), id: before.id } : undefined,
        },
      );
      const decorated = rows.map((row) => ({
        ...toDto(row),
        id: row.id,
        created_at: row.createdAt,
      }));
      return buildPage(decorated, limit, secret);
    });
  }

  async update(
    input: UpdateFeatureFlagInput,
  ): Promise<{ updated: boolean; items: FeatureFlagDto[] }> {
    if (!isKnownPlatformFlagKey(input.key)) {
      throw new DomainError('PLATFORM.FLAG_KEY_UNKNOWN', { key: input.key });
    }

    return this.prisma.withAdmin(async (admin) => {
      const previous = input.organizationId
        ? await this.flags.readForOrganization(admin, input.key, input.organizationId)
        : await this.flags.readGlobal(admin, input.key);

      const write = input.organizationId
        ? this.flags.writeForOrganization(admin, input.key, input.organizationId, {
            isEnabled: input.isEnabled,
            rolloutPercentage: input.rolloutPercentage,
            payload: input.payload,
            startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
            endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
          })
        : this.flags.writeGlobal(admin, input.key, {
            isEnabled: input.isEnabled,
            rolloutPercentage: input.rolloutPercentage,
            payload: input.payload,
            startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
            endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
          });
      const updated = await write;

      const organizationIds = input.organizationId
        ? [input.organizationId]
        : await this.flags.listActiveOrganizationIds(admin);
      const newState = toJsonState(updated);
      const previousState = previous ? toJsonState(previous) : null;
      await Promise.all(
        organizationIds.map((organizationId) =>
          this.audit.record(admin, {
            organizationId,
            action: 'UPDATE',
            operation: AUDIT_OPERATIONS.FEATURE_FLAG_CHANGED,
            entityType: 'feature_flags',
            entityId: updated.id,
            actorUserId: input.actorUserId,
            previousState,
            newState,
          }),
        ),
      );

      return { updated: true, items: [toDto(updated)] };
    });
  }
}
