import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { clampLimit, decodeCursor, encodeCursor } from '../../../shared/pagination/cursor';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { SyncBatchSummary, SyncReader } from '../domain/sync-types';
import { fullNameOf } from './sync-conflict-mapper';
import { rowToBatchResult, type SyncBatchRow } from './sync-batch-mapper';
import type { SyncBatchResult } from '../domain/sync-types';

export interface ListBatchesFilters {
  collectorUserId?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}

export interface BatchPage {
  items: SyncBatchSummary[];
  pageInfo: { nextCursor: string | null; hasNextPage: boolean; limit: number };
}

/** Lectures de `sync_batches` : détail (`GET /{id}`) et liste filtrable. */
@Injectable()
export class SyncBatchesQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  /** COLLECTOR : uniquement ses propres lots. MANAGER (et OWNER) : tous. */
  async get(organizationId: string, reader: SyncReader, id: string): Promise<SyncBatchResult> {
    const row = await this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      tx.sync_batches.findFirst({
        where: { id, ...(reader.role === 'COLLECTOR' ? { user_id: reader.userId } : {}) },
      }),
    );
    if (!row) throw new DomainError('SYNC.BATCH_NOT_FOUND', { id });
    return rowToBatchResult(row as unknown as SyncBatchRow);
  }

  async list(
    organizationId: string,
    reader: SyncReader,
    filters: ListBatchesFilters,
  ): Promise<BatchPage> {
    const secret = this.config.get('CURSOR_SECRET');
    const limit = clampLimit(filters.limit);
    const cursor = filters.cursor ? decodeCursor(filters.cursor, secret) : null;

    const { rows, userById } = await this.prisma.withTenant(
      organizationId,
      reader.userId,
      async (tx) => {
        const rows = await tx.sync_batches.findMany({
          where: {
            ...(filters.collectorUserId ? { user_id: filters.collectorUserId } : {}),
            ...(filters.status ? { status: filters.status as never } : {}),
            ...(filters.from || filters.to
              ? {
                  received_at: {
                    ...(filters.from ? { gte: new Date(filters.from) } : {}),
                    ...(filters.to ? { lte: new Date(filters.to) } : {}),
                  },
                }
              : {}),
            ...(cursor
              ? {
                  OR: [
                    { received_at: { lt: new Date(cursor.createdAt) } },
                    { received_at: new Date(cursor.createdAt), id: { lt: cursor.id } },
                  ],
                }
              : {}),
          },
          orderBy: [{ received_at: 'desc' }, { id: 'desc' }],
          take: limit + 1,
        });
        const userIds = [...new Set(rows.map((r) => r.user_id))];
        const users = await tx.users.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true,
            phone_e164: true,
          },
        });
        return { rows, userById: new Map(users.map((u) => [u.id, u])) };
      },
    );

    const hasNextPage = rows.length > limit;
    const page = hasNextPage ? rows.slice(0, limit) : rows;
    const last = page.at(-1);

    return {
      items: page.map((row) => toSummary(row, userById)),
      pageInfo: {
        nextCursor:
          hasNextPage && last
            ? encodeCursor({ createdAt: last.received_at.toISOString(), id: last.id }, secret)
            : null,
        hasNextPage,
        limit,
      },
    };
  }
}

interface UserLite {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone_e164: string;
}

function toSummary(
  row: {
    id: string;
    batch_ref: string;
    device_id: string;
    device_platform: string | null;
    app_version: string | null;
    user_id: string;
    status: string;
    operations_count: number;
    applied_count: number;
    rejected_count: number;
    conflicts_count: number;
    received_at: Date;
    applied_at: Date | null;
  },
  userById: Map<string, UserLite>,
): SyncBatchSummary {
  const user = userById.get(row.user_id);
  return {
    batchId: row.id,
    batchRef: row.batch_ref,
    deviceId: row.device_id,
    devicePlatform: row.device_platform,
    appVersion: row.app_version,
    collectorUserId: row.user_id,
    collector: { userId: row.user_id, fullName: user ? fullNameOf(user) : row.user_id },
    status: row.status,
    operationsCount: row.operations_count,
    appliedCount: row.applied_count,
    rejectedCount: row.rejected_count,
    conflictsCount: row.conflicts_count,
    receivedAt: row.received_at.toISOString(),
    appliedAt: row.applied_at ? row.applied_at.toISOString() : null,
  };
}
