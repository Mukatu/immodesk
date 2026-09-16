import { Injectable } from '@nestjs/common';
import { notFound } from '../../../shared/errors/domain-error';
import { AppConfigService } from '../../../shared/config/config.module';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  compareConditions,
  normalizeKey,
  type InspectionCondition,
} from '../domain/inspection-rules';
import {
  toInspectionItemView,
  toInspectionView,
  type InspectionItemRow,
  type InspectionPhotoRow,
  type InspectionRow,
} from './inspection-views';

export interface InspectionListFilters {
  unitId?: string;
  leaseId?: string;
  type?: string;
  status?: string;
  limit?: number;
  cursor?: string;
}

@Injectable()
export class InspectionsQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async list(
    organizationId: string,
    userId: string,
    filters: InspectionListFilters,
  ): Promise<Page<Record<string, unknown>>> {
    const conditions = ['i.organization_id = $1::uuid'];
    const params: unknown[] = [organizationId];
    if (filters.unitId) {
      params.push(filters.unitId);
      conditions.push(`i.unit_id = $${params.length}::uuid`);
    }
    if (filters.leaseId) {
      params.push(filters.leaseId);
      conditions.push(`i.lease_id = $${params.length}::uuid`);
    }
    if (filters.type) {
      params.push(filters.type);
      conditions.push(`i.inspection_type = $${params.length}::inspection_type`);
    }
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`i.status = $${params.length}::inspection_status`);
    }
    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'i');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }

    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<InspectionRow[]>(
        `SELECT i.* FROM inspections i WHERE ${conditions.join(' AND ')} ${keysetOrderBy('i')} LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );
    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return { items: page.items.map(toInspectionView), pageInfo: page.pageInfo };
  }

  async detail(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<Record<string, unknown>> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const row = (await tx.inspections.findFirst({
        where: { id },
      })) as unknown as InspectionRow | null;
      if (!row) throw notFound('inspections', id);
      const items = (await tx.inspection_items.findMany({
        where: { inspection_id: id },
        orderBy: { position: 'asc' },
      })) as unknown as InspectionItemRow[];
      const photos = (await tx.inspection_photos.findMany({
        where: { inspection_id: id },
      })) as unknown as InspectionPhotoRow[];
      const photosByItem = new Map<string, InspectionPhotoRow[]>();
      for (const photo of photos) {
        if (!photo.inspection_item_id) continue;
        const list = photosByItem.get(photo.inspection_item_id) ?? [];
        list.push(photo);
        photosByItem.set(photo.inspection_item_id, list);
      }
      return {
        ...toInspectionView(row),
        items: items.map((item) => toInspectionItemView(item, photosByItem.get(item.id) ?? [])),
      };
    });
  }

  /** `GET /v1/units/{id}/inspections/compare` : dernier MOVE_IN vs dernier MOVE_OUT, tous deux SIGNED. */
  async compare(
    organizationId: string,
    userId: string,
    unitId: string,
  ): Promise<Record<string, unknown>> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const [moveIn] = await tx.$queryRawUnsafe<InspectionRow[]>(
        `SELECT * FROM inspections WHERE unit_id = $1::uuid AND inspection_type = 'MOVE_IN' AND status = 'SIGNED'
          ORDER BY performed_at DESC NULLS LAST, created_at DESC LIMIT 1`,
        unitId,
      );
      const [moveOut] = await tx.$queryRawUnsafe<InspectionRow[]>(
        `SELECT * FROM inspections WHERE unit_id = $1::uuid AND inspection_type = 'MOVE_OUT' AND status = 'SIGNED'
          ORDER BY performed_at DESC NULLS LAST, created_at DESC LIMIT 1`,
        unitId,
      );

      const entryItems = moveIn
        ? ((await tx.inspection_items.findMany({
            where: { inspection_id: moveIn.id },
          })) as unknown as InspectionItemRow[])
        : [];
      const exitItems = moveOut
        ? ((await tx.inspection_items.findMany({
            where: { inspection_id: moveOut.id },
          })) as unknown as InspectionItemRow[])
        : [];
      const photos = (await tx.inspection_photos.findMany({
        where: { inspection_id: { in: [moveIn?.id, moveOut?.id].filter(Boolean) as string[] } },
      })) as unknown as InspectionPhotoRow[];

      const byKey = new Map<string, { entry?: InspectionItemRow; exit?: InspectionItemRow }>();
      for (const item of entryItems) {
        const key = normalizeKey(item.room_label, item.element_label);
        byKey.set(key, { ...byKey.get(key), entry: item });
      }
      for (const item of exitItems) {
        const key = normalizeKey(item.room_label, item.element_label);
        byKey.set(key, { ...byKey.get(key), exit: item });
      }

      const photosOf = (itemId: string | undefined): string[] =>
        itemId
          ? photos.filter((p) => p.inspection_item_id === itemId).map((p) => p.document_id)
          : [];

      let totalSuggestedDeduction = 0n;
      const rows = [...byKey.entries()].map(([, pair]) => {
        const entryCondition = (pair.entry?.condition as InspectionCondition | undefined) ?? null;
        const exitCondition = (pair.exit?.condition as InspectionCondition | undefined) ?? null;
        const { degradationLevels, status } = compareConditions(entryCondition, exitCondition);
        const suggestedDeductionAmount =
          status === 'DEGRADED' ? (pair.exit?.repair_amount ?? 0n) : 0n;
        totalSuggestedDeduction += suggestedDeductionAmount;
        const source = pair.exit ?? pair.entry!;
        return {
          roomLabel: source.room_label,
          elementLabel: source.element_label,
          entryCondition,
          exitCondition,
          degradationLevels,
          suggestedDeductionAmount: Number(suggestedDeductionAmount),
          entryPhotos: photosOf(pair.entry?.id),
          exitPhotos: photosOf(pair.exit?.id),
          status,
        };
      });

      return {
        unitId,
        moveIn: moveIn ? toInspectionView(moveIn) : null,
        moveOut: moveOut ? toInspectionView(moveOut) : null,
        rows,
        totalSuggestedDeduction: Number(totalSuggestedDeduction),
      };
    });
  }
}
