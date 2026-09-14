import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { DeviceStatus, SyncReader } from '../domain/sync-types';
import { fullNameOf, storedResults, type StoredBatchRow } from './sync-conflict-mapper';

/**
 * `GET /v1/sync/devices` : supervision — « quel démarcheur n'a pas
 * synchronisé depuis longtemps » (docs/api/phase5-contract.md).
 */
@Injectable()
export class SyncDevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, reader: SyncReader): Promise<{ items: DeviceStatus[] }> {
    const { rows, userById } = await this.prisma.withTenant(
      organizationId,
      reader.userId,
      async (tx) => {
        const rows = await tx.sync_batches.findMany({
          orderBy: { received_at: 'desc' },
          take: 5000,
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

    const byDevice = new Map<string, typeof rows>();
    for (const row of rows) {
      const bucket = byDevice.get(row.device_id) ?? [];
      bucket.push(row);
      byDevice.set(row.device_id, bucket);
    }

    const items: DeviceStatus[] = [];
    for (const [deviceId, batches] of byDevice) {
      const latest = batches[0];
      const pendingConflicts = batches.reduce(
        (sum, b) =>
          sum +
          storedResults(b as unknown as StoredBatchRow).filter(
            (r) => r.outcome === 'CONFLICT' && !r.resolution,
          ).length,
        0,
      );
      const totalApplied = batches.reduce((sum, b) => sum + b.applied_count, 0);
      const user = userById.get(latest.user_id);
      items.push({
        deviceId,
        devicePlatform: latest.device_platform,
        appVersion: latest.app_version,
        collector: { userId: latest.user_id, fullName: user ? fullNameOf(user) : latest.user_id },
        lastBatchAt: latest.received_at.toISOString(),
        lastBatchStatus: latest.status,
        pendingConflicts,
        totalApplied,
      });
    }

    items.sort((a, b) => b.lastBatchAt.localeCompare(a.lastBatchAt));
    return { items };
  }
}
