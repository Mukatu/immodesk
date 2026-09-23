import { Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@prisma/client';
import { newId } from '../../../shared/ids/uuid';

/**
 * Surface Prisma nécessaire à ce dépôt : satisfaite aussi bien par le client
 * applicatif (`PrismaService`, lectures publiques des drapeaux globaux — la
 * policy `org_isolation` laisse toujours passer `organization_id IS NULL`,
 * docs/schema/schema.sql ~L3128) que par le client `immodesk_admin`
 * (`PrismaService.withAdmin`, seul habilité à écrire un drapeau global —
 * arbitrage 2).
 */
export type FlagsClient = Pick<
  PrismaClient,
  'feature_flags' | 'organizations' | 'audit_logs' | 'subscriptions'
>;

export interface FeatureFlagRow {
  id: string;
  key: string;
  organizationId: string | null;
  isEnabled: boolean;
  rolloutPercentage: number;
  payload: Record<string, unknown>;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface RawFlagRow {
  id: string;
  key: string;
  organization_id: string | null;
  is_enabled: boolean;
  rollout_percentage: number;
  payload: unknown;
  starts_at: Date | null;
  ends_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function toRow(row: RawFlagRow): FeatureFlagRow {
  return {
    id: row.id,
    key: row.key,
    organizationId: row.organization_id,
    isEnabled: row.is_enabled,
    rolloutPercentage: row.rollout_percentage,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface WriteFlagInput {
  isEnabled?: boolean;
  rolloutPercentage?: number;
  payload?: Record<string, unknown>;
  startsAt?: Date | null;
  endsAt?: Date | null;
  description?: string | null;
}

@Injectable()
export class PlatformFlagsRepository {
  /** Lecture d'un drapeau GLOBAL (`organization_id IS NULL`). Lecture pure. */
  async readGlobal(client: FlagsClient, key: string): Promise<FeatureFlagRow | null> {
    const row = await client.feature_flags.findFirst({ where: { key, organization_id: null } });
    return row ? toRow(row) : null;
  }

  async readForOrganization(
    client: FlagsClient,
    key: string,
    organizationId: string,
  ): Promise<FeatureFlagRow | null> {
    const row = await client.feature_flags.findFirst({
      where: { key, organization_id: organizationId },
    });
    return row ? toRow(row) : null;
  }

  /**
   * Crée ou met à jour la ligne GLOBALE d'une clé. Sans contrainte unique
   * exploitable par `upsert` côté Prisma (l'index `feature_flags_global_key_uk`
   * est un index partiel, non représenté dans `schema.prisma`) : lecture puis
   * écriture, à réserver au client `immodesk_admin` (seul autorisé à écrire
   * une ligne globale, arbitrage 2).
   */
  async writeGlobal(
    client: FlagsClient,
    key: string,
    data: WriteFlagInput,
  ): Promise<FeatureFlagRow> {
    return this.write(client, key, null, data);
  }

  async writeForOrganization(
    client: FlagsClient,
    key: string,
    organizationId: string,
    data: WriteFlagInput,
  ): Promise<FeatureFlagRow> {
    return this.write(client, key, organizationId, data);
  }

  private async write(
    client: FlagsClient,
    key: string,
    organizationId: string | null,
    data: WriteFlagInput,
  ): Promise<FeatureFlagRow> {
    const existing = await client.feature_flags.findFirst({
      where: { key, organization_id: organizationId },
    });
    const payload =
      data.payload !== undefined ? (data.payload as Prisma.InputJsonValue) : undefined;
    if (existing) {
      const updated = await client.feature_flags.update({
        where: { id: existing.id },
        data: {
          is_enabled: data.isEnabled,
          rollout_percentage: data.rolloutPercentage,
          payload,
          starts_at: data.startsAt,
          ends_at: data.endsAt,
          description: data.description,
        },
      });
      return toRow(updated);
    }
    const created = await client.feature_flags.create({
      data: {
        id: newId(),
        key,
        organization_id: organizationId,
        is_enabled: data.isEnabled ?? false,
        rollout_percentage: data.rolloutPercentage ?? 0,
        payload: payload ?? {},
        starts_at: data.startsAt ?? null,
        ends_at: data.endsAt ?? null,
        description: data.description ?? null,
      },
    });
    return toRow(created);
  }

  /** Toutes les organisations ACTIVES : périmètre de diffusion de l'audit (arbitrage 4). */
  async listActiveOrganizationIds(client: FlagsClient): Promise<string[]> {
    const rows = await client.organizations.findMany({
      where: { status: 'ACTIVE', deleted_at: null },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async list(
    client: FlagsClient,
    filters: { key?: string; organizationId?: string },
    options: { take: number; before?: { createdAt: Date; id: string } },
  ): Promise<FeatureFlagRow[]> {
    const rows = await client.feature_flags.findMany({
      where: {
        key: filters.key,
        organization_id: filters.organizationId,
        ...(options.before
          ? {
              OR: [
                { created_at: { lt: options.before.createdAt } },
                { created_at: options.before.createdAt, id: { lt: options.before.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: options.take,
    });
    return rows.map(toRow);
  }
}
