import { Injectable } from '@nestjs/common';
import { notFound } from '../../../shared/errors/domain-error';
import { AppConfigService } from '../../../shared/config/config.module';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  toMaintenanceDetail,
  toMaintenanceSummary,
  type MaintenanceRequestRow,
  type MaintenanceSummaryView,
  type MaintenanceUpdateRow,
} from './maintenance-views';

export interface MaintenanceListFilters {
  status?: string;
  priority?: string;
  propertyId?: string;
  assignedToUserId?: string;
  overdueOnly?: boolean;
  limit?: number;
  cursor?: string;
}

/** Lectures transverses des demandes de maintenance : liste paginée et détail. */
@Injectable()
export class MaintenanceQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async list(
    organizationId: string,
    userId: string,
    filters: MaintenanceListFilters,
  ): Promise<Page<MaintenanceSummaryView>> {
    const conditions = ['r.organization_id = $1::uuid'];
    const params: unknown[] = [organizationId];
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`r.status = $${params.length}::maintenance_status`);
    }
    if (filters.priority) {
      params.push(filters.priority);
      conditions.push(`r.priority = $${params.length}::maintenance_priority`);
    }
    if (filters.propertyId) {
      params.push(filters.propertyId);
      conditions.push(`r.property_id = $${params.length}::uuid`);
    }
    if (filters.assignedToUserId) {
      params.push(filters.assignedToUserId);
      conditions.push(`r.assigned_to_user_id = $${params.length}::uuid`);
    }
    if (filters.overdueOnly) {
      conditions.push(`r.sla_due_at IS NOT NULL AND r.sla_due_at < now()
        AND r.status NOT IN ('CLOSED', 'REJECTED')`);
    }

    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'r');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }

    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<
        Array<MaintenanceRequestRow & { property_name: string; unit_code: string | null }>
      >(
        `SELECT r.*, p.name AS property_name, u.code AS unit_code
           FROM maintenance_requests r
           JOIN properties p ON p.id = r.property_id
           LEFT JOIN units u ON u.id = r.unit_id
          WHERE ${conditions.join(' AND ')}
          ${keysetOrderBy('r')}
          LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );
    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return {
      items: page.items.map((r) =>
        toMaintenanceSummary(
          r,
          { id: r.property_id, name: r.property_name },
          r.unit_id ? { id: r.unit_id, code: r.unit_code ?? '' } : null,
        ),
      ),
      pageInfo: page.pageInfo,
    };
  }

  async detail(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<Record<string, unknown>> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const rows = await tx.$queryRawUnsafe<
        Array<MaintenanceRequestRow & { property_name: string; unit_code: string | null }>
      >(
        `SELECT r.*, p.name AS property_name, u.code AS unit_code
           FROM maintenance_requests r
           JOIN properties p ON p.id = r.property_id
           LEFT JOIN units u ON u.id = r.unit_id
          WHERE r.id = $1::uuid`,
        id,
      );
      const row = rows[0];
      if (!row) throw notFound('maintenance_requests', id);
      const updates = await tx.$queryRawUnsafe<MaintenanceUpdateRow[]>(
        `SELECT * FROM maintenance_updates WHERE request_id = $1::uuid ORDER BY occurred_at DESC`,
        id,
      );
      const summary = toMaintenanceSummary(
        row,
        { id: row.property_id, name: row.property_name },
        row.unit_id ? { id: row.unit_id, code: row.unit_code ?? '' } : null,
      );
      return toMaintenanceDetail(row, summary, updates);
    });
  }
}
