import { Injectable } from '@nestjs/common';
import { DomainError, notFound } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { toAmount } from '../../../shared/money/amount';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { readOperationalSettings } from '../../../shared/settings/operational-settings';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { NumberingService } from '../../numbering/application/numbering.service';
import {
  assertTransition,
  computeSlaDueAt,
  type MaintenancePriority,
  type MaintenanceReporter,
  type MaintenanceStatus,
} from '../domain/maintenance-rules';
import type { MaintenanceRequestRow, MaintenanceUpdateRow } from './maintenance-views';

export interface MaintenanceCreateInput {
  propertyId: string;
  unitId?: string | null;
  leaseId?: string | null;
  tenantId?: string | null;
  priority?: MaintenancePriority;
  reporterType?: MaintenanceReporter;
  category?: string;
  title: string;
  description: string;
  locationDetail?: string | null;
  estimatedAmount?: number | string;
  chargedTo?: 'LANDLORD' | 'TENANT' | 'ORGANIZATION';
  inspectionId?: string | null;
  clientRef?: string | null;
}

export interface UpdateInput {
  newStatus?: MaintenanceStatus;
  message?: string | null;
  photoDocumentId?: string | null;
  amountDelta?: number | string;
  isVisibleToTenant?: boolean;
  expenseId?: string | null;
  clientRef?: string | null;
}

/**
 * Cycle de vie des demandes de maintenance : machine à huit statuts, délai
 * cible calculé à la création, historique horodaté dans `maintenance_updates`.
 */
@Injectable()
export class MaintenanceRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbering: NumberingService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    organizationId: string,
    userId: string | null,
    input: MaintenanceCreateInput,
  ): Promise<{ request: MaintenanceRequestRow; replayed: boolean }> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      if (input.clientRef) {
        const existing = (await tx.maintenance_requests.findFirst({
          where: { client_ref: input.clientRef },
        })) as unknown as MaintenanceRequestRow | null;
        if (existing) return { request: existing, replayed: true };
      }

      const now = new Date();
      const settings = await tx.organization_settings.findUnique({
        where: { organization_id: organizationId },
      });
      const facilities = readOperationalSettings(settings?.settings_json ?? null).facilities;
      const priority = input.priority ?? 'NORMAL';
      const slaDueAt = computeSlaDueAt(priority, now, facilities.maintenanceSlaHours);
      const { number } = await this.numbering.nextNumber(tx, organizationId, 'MAINTENANCE', now);
      const id = newId();

      const created = (await tx.maintenance_requests.create({
        data: {
          id,
          organization_id: organizationId,
          property_id: input.propertyId,
          unit_id: input.unitId ?? null,
          lease_id: input.leaseId ?? null,
          tenant_id: input.tenantId ?? null,
          reference: number,
          status: 'OPEN',
          priority: priority as never,
          reporter_type: (input.reporterType ?? 'MANAGER') as never,
          reported_by_user_id: userId,
          category: (input.category ?? 'REPAIR') as never,
          title: input.title,
          description: input.description,
          location_detail: input.locationDetail ?? null,
          reported_at: now,
          sla_due_at: slaDueAt,
          estimated_amount: toAmount(input.estimatedAmount ?? 0),
          charged_to: (input.chargedTo ?? 'LANDLORD') as never,
          inspection_id: input.inspectionId ?? null,
          client_ref: input.clientRef ?? null,
        },
      })) as unknown as MaintenanceRequestRow;

      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.MAINTENANCE_REQUEST_CREATED,
        entityType: 'maintenance_requests',
        entityId: id,
        newState: toJsonState({ reference: number, priority, status: 'OPEN' }),
      });
      return { request: created, replayed: false };
    });
  }

  async acknowledge(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<MaintenanceRequestRow> {
    return this.prisma.withTenant(organizationId, userId, (tx) =>
      this.transition(tx, id, userId, {
        newStatus: 'ACKNOWLEDGED',
        operation: AUDIT_OPERATIONS.MAINTENANCE_REQUEST_ACKNOWLEDGED,
        extraColumns: { acknowledged_at: new Date() },
      }),
    );
  }

  async assign(
    organizationId: string,
    userId: string,
    id: string,
    assignedToUserId: string,
  ): Promise<MaintenanceRequestRow> {
    return this.prisma.withTenant(organizationId, userId, (tx) =>
      this.transition(tx, id, userId, {
        newStatus: 'ASSIGNED',
        operation: AUDIT_OPERATIONS.MAINTENANCE_REQUEST_ASSIGNED,
        extraColumns: { assigned_to_user_id: assignedToUserId, assigned_at: new Date() },
      }),
    );
  }

  async addUpdate(
    organizationId: string,
    userId: string | null,
    id: string,
    input: UpdateInput,
  ): Promise<{ request: MaintenanceRequestRow; update: MaintenanceUpdateRow; replayed: boolean }> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      if (input.clientRef) {
        const existingUpdate = (await tx.maintenance_updates.findFirst({
          where: { request_id: id, client_ref: input.clientRef },
        })) as unknown as MaintenanceUpdateRow | null;
        if (existingUpdate) {
          const request = (await tx.maintenance_requests.findFirst({
            where: { id },
          })) as unknown as MaintenanceRequestRow;
          return { request, update: existingUpdate, replayed: true };
        }
      }
      const extraColumns: Record<string, unknown> = {};
      if (input.newStatus === 'IN_PROGRESS') extraColumns.started_at = new Date();
      const request = await this.transition(tx, id, userId, {
        newStatus: input.newStatus,
        operation: AUDIT_OPERATIONS.MAINTENANCE_UPDATE_ADDED,
        extraColumns,
        message: input.message ?? null,
        photoDocumentId: input.photoDocumentId ?? null,
        amountDelta: toAmount(input.amountDelta ?? 0),
        isVisibleToTenant: input.isVisibleToTenant,
        expenseId: input.expenseId ?? null,
        clientRef: input.clientRef ?? null,
      });
      const update = await this.latestUpdate(tx, id);
      return { request, update: update!, replayed: false };
    });
  }

  async resolve(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<MaintenanceRequestRow> {
    return this.prisma.withTenant(organizationId, userId, (tx) =>
      this.transition(tx, id, userId, {
        newStatus: 'RESOLVED',
        operation: AUDIT_OPERATIONS.MAINTENANCE_REQUEST_RESOLVED,
        extraColumns: { resolved_at: new Date() },
      }),
    );
  }

  async close(organizationId: string, userId: string, id: string): Promise<MaintenanceRequestRow> {
    return this.prisma.withTenant(organizationId, userId, (tx) =>
      this.transition(tx, id, userId, {
        newStatus: 'CLOSED',
        operation: AUDIT_OPERATIONS.MAINTENANCE_REQUEST_CLOSED,
        extraColumns: { closed_at: new Date() },
      }),
    );
  }

  async reject(
    organizationId: string,
    userId: string,
    id: string,
    reason: string,
  ): Promise<MaintenanceRequestRow> {
    if (!reason?.trim()) throw new DomainError('MAINTENANCE.REJECTION_REASON_REQUIRED', {});
    return this.prisma.withTenant(organizationId, userId, (tx) =>
      this.transition(tx, id, userId, {
        newStatus: 'REJECTED',
        operation: AUDIT_OPERATIONS.MAINTENANCE_REQUEST_REJECTED,
        extraColumns: { rejection_reason: reason },
      }),
    );
  }

  private async latestUpdate(
    tx: TenantClient,
    requestId: string,
  ): Promise<MaintenanceUpdateRow | null> {
    const rows = await tx.$queryRawUnsafe<MaintenanceUpdateRow[]>(
      `SELECT * FROM maintenance_updates WHERE request_id = $1::uuid ORDER BY occurred_at DESC LIMIT 1`,
      requestId,
    );
    return rows[0] ?? null;
  }

  private async transition(
    tx: TenantClient,
    id: string,
    actorUserId: string | null,
    params: {
      newStatus?: MaintenanceStatus;
      operation: string;
      extraColumns?: Record<string, unknown>;
      message?: string | null;
      photoDocumentId?: string | null;
      amountDelta?: bigint;
      isVisibleToTenant?: boolean;
      expenseId?: string | null;
      clientRef?: string | null;
    },
  ): Promise<MaintenanceRequestRow> {
    const before = (await tx.maintenance_requests.findFirst({
      where: { id },
    })) as unknown as MaintenanceRequestRow | null;
    if (!before) throw notFound('maintenance_requests', id);

    if (params.newStatus) assertTransition(before.status as MaintenanceStatus, params.newStatus);

    const after = (await tx.maintenance_requests.update({
      where: { id },
      data: {
        ...(params.newStatus ? { status: params.newStatus as never } : {}),
        ...(params.amountDelta && params.amountDelta > 0n
          ? { actual_amount: before.actual_amount + params.amountDelta }
          : {}),
        ...(params.extraColumns ?? {}),
        updated_at: new Date(),
      },
    })) as unknown as MaintenanceRequestRow;

    await tx.maintenance_updates.create({
      data: {
        id: newId(),
        organization_id: before.organization_id,
        request_id: id,
        author_user_id: actorUserId,
        previous_status: before.status as never,
        new_status: (params.newStatus ?? before.status) as never,
        message: params.message ?? null,
        is_visible_to_tenant: params.isVisibleToTenant ?? true,
        amount_delta: params.amountDelta ?? 0n,
        photo_document_id: params.photoDocumentId ?? null,
        expense_id: params.expenseId ?? null,
        client_ref: params.clientRef ?? null,
      },
    });

    await audit(this.auditService, tx, {
      organizationId: before.organization_id,
      actorUserId,
      action: 'STATE_TRANSITION',
      operation: params.operation,
      entityType: 'maintenance_requests',
      entityId: id,
      previousState: toJsonState({ status: before.status }),
      newState: toJsonState({ status: after.status }),
    });
    return after;
  }
}
