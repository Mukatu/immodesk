import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { clampLimit, decodeCursor, encodeCursor } from '../../../shared/pagination/cursor';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { SyncConflict } from '../domain/sync-conflict-types';
import type { SyncReader } from '../domain/sync-types';
import {
  buildSyncConflict,
  fullNameOf,
  storedResults,
  type StoredBatchRow,
} from './sync-conflict-mapper';

export interface ListConflictsFilters {
  resolved?: boolean;
  collectorUserId?: string;
  limit?: number;
  cursor?: string;
}

export interface ConflictPage {
  items: SyncConflict[];
  pageInfo: { nextCursor: string | null; hasNextPage: boolean; limit: number };
}

/**
 * `GET /v1/sync/conflicts` : agrège les éléments `CONFLICT` de
 * `sync_batches.result` (docs/api/phase5-contract.md, arbitrage 2 — aucune
 * table de conflits). Le classement le plus récent en premier, pagination
 * en mémoire sur un jeu déjà borné : le volume de conflits d'une
 * organisation reste, en pratique, très inférieur à celui des lots.
 */
@Injectable()
export class SyncConflictsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async list(
    organizationId: string,
    reader: SyncReader,
    filters: ListConflictsFilters,
  ): Promise<ConflictPage> {
    const limit = clampLimit(filters.limit, 200);
    const secret = this.config.get('CURSOR_SECRET');

    const { rows, userById } = await this.prisma.withTenant(
      organizationId,
      reader.userId,
      async (tx) => {
        // `conflicts_count` ne compte que les conflits ENCORE à arbitrer : un
        // conflit résolu (APPLY ou DISCARD) le fait retomber à zéro, alors que
        // `resolved=true` doit continuer à le lister. Le filtre porte donc sur
        // le contenu JSONB — au moins un élément `outcome: CONFLICT`, résolu ou
        // non — et non sur ce compteur.
        const rows = await tx.$queryRawUnsafe<StoredBatchRow[]>(
          `SELECT * FROM sync_batches
          WHERE result @> '[{"outcome":"CONFLICT"}]'::jsonb
            ${filters.collectorUserId ? 'AND user_id = $1::uuid' : ''}
          ORDER BY received_at DESC
          LIMIT 1000`,
          ...(filters.collectorUserId ? [filters.collectorUserId] : []),
        );
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

    const all: SyncConflict[] = [];
    for (const row of rows) {
      for (const item of storedResults(row as unknown as StoredBatchRow)) {
        if (item.outcome !== 'CONFLICT') continue;
        if (filters.resolved === true && !item.resolution) continue;
        if (filters.resolved === false && item.resolution) continue;
        const user = userById.get(row.user_id);
        all.push(
          buildSyncConflict(row as unknown as StoredBatchRow, item, {
            userId: row.user_id,
            fullName: user ? fullNameOf(user) : row.user_id,
          }),
        );
      }
    }

    const startIndex = filters.cursor
      ? Number(decodeCursor(filters.cursor, secret).createdAt) || 0
      : 0;
    const page = all.slice(startIndex, startIndex + limit);
    const hasNextPage = startIndex + limit < all.length;

    return {
      items: page,
      pageInfo: {
        nextCursor: hasNextPage
          ? encodeCursor({ createdAt: String(startIndex + limit), id: 'sync-conflicts' }, secret)
          : null,
        hasNextPage,
        limit,
      },
    };
  }
}
