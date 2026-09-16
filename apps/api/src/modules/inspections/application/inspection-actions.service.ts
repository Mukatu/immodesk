import { Injectable } from '@nestjs/common';
import { DomainError, notFound } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { DepositsService } from '../../deposits/application/deposits.service';
import type { DepositDetailView } from '../../deposits/application/deposit-views';
import { MaintenanceRequestsService } from '../../maintenance/application/maintenance-requests.service';
import type { MaintenanceRequestRow } from '../../maintenance/application/maintenance-views';
import { deductionReason, itemMarker } from '../domain/inspection-rules';
import type { InspectionItemRow, InspectionRow } from './inspection-views';

/**
 * Retenue sur dépôt et conversion en demande de maintenance.
 *
 * `deposit_movements` ne porte pas l'identifiant du poste (arbitrage 4 du
 * contrat) : la traçabilité et le contrôle « pas deux retenues pour le même
 * poste » passent donc par un marqueur `(poste {itemId})` inséré dans le
 * libellé du mouvement / la description de la demande, et relu par un
 * `LIKE`. C'est une conséquence assumée de l'absence de colonne dédiée dans
 * le DDL, jamais modifié.
 */
@Injectable()
export class InspectionActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deposits: DepositsService,
    private readonly maintenance: MaintenanceRequestsService,
  ) {}

  async applyDepositDeduction(
    organizationId: string,
    userId: string,
    inspectionId: string,
    itemId: string,
    input: { amount?: number | string; reason?: string; managerOverride?: boolean },
  ): Promise<DepositDetailView> {
    const { inspection, item } = await this.loadInspectionItem(
      organizationId,
      userId,
      inspectionId,
      itemId,
    );
    if (!inspection.lease_id) throw new DomainError('INSPECTIONS.NO_DEPOSIT', { inspectionId });

    const marker = itemMarker(itemId);
    await this.assertNoDuplicateDeduction(organizationId, userId, inspectionId, marker);
    if (!input.managerOverride) {
      await this.assertNoMaintenanceConflict(organizationId, userId, inspectionId, marker);
    }

    return this.deposits.recordMovement(organizationId, userId, inspection.lease_id, {
      movementType: 'DEDUCTION',
      amount: input.amount ?? item.repair_amount.toString(),
      reason: input.reason
        ? `${input.reason} ${marker}`
        : deductionReason(item.room_label, item.element_label, itemId),
      inspectionId,
    });
  }

  async convertToMaintenance(
    organizationId: string,
    userId: string,
    inspectionId: string,
    itemId: string,
    input: { managerOverride?: boolean; priority?: string; reporterType?: string },
  ): Promise<MaintenanceRequestRow> {
    const { inspection, item } = await this.loadInspectionItem(
      organizationId,
      userId,
      inspectionId,
      itemId,
    );
    const marker = itemMarker(itemId);

    const existing = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM maintenance_requests WHERE inspection_id = $1::uuid AND description LIKE $2 LIMIT 1`,
        inspectionId,
        `%${marker}%`,
      ),
    );
    if (existing[0]) throw new DomainError('INSPECTIONS.MAINTENANCE_ALREADY_CREATED', { itemId });

    if (!input.managerOverride) {
      await this.assertNoDuplicateDeduction(organizationId, userId, inspectionId, marker);
    }

    const { request } = await this.maintenance.create(organizationId, userId, {
      propertyId: inspection.property_id,
      unitId: inspection.unit_id,
      leaseId: inspection.lease_id,
      tenantId: inspection.tenant_id,
      priority: (input.priority as never) ?? 'NORMAL',
      reporterType: (input.reporterType as never) ?? 'INSPECTION',
      title: `${item.room_label} — ${item.element_label}`,
      description: `Constat d'état des lieux ${inspection.reference} : ${item.damage_description ?? item.condition} ${marker}`,
      estimatedAmount: item.repair_amount.toString(),
      chargedTo: item.charged_to as never,
      inspectionId,
    });
    return request;
  }

  private async loadInspectionItem(
    organizationId: string,
    userId: string,
    inspectionId: string,
    itemId: string,
  ): Promise<{ inspection: InspectionRow; item: InspectionItemRow }> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const inspection = (await tx.inspections.findFirst({
        where: { id: inspectionId },
      })) as unknown as InspectionRow | null;
      if (!inspection) throw notFound('inspections', inspectionId);
      const item = (await tx.inspection_items.findFirst({
        where: { id: itemId, inspection_id: inspectionId },
      })) as unknown as InspectionItemRow | null;
      if (!item) throw notFound('inspection_items', itemId);
      return { inspection, item };
    });
  }

  private async assertNoDuplicateDeduction(
    organizationId: string,
    userId: string,
    inspectionId: string,
    marker: string,
  ): Promise<void> {
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM deposit_movements
          WHERE inspection_id = $1::uuid AND movement_type = 'DEDUCTION' AND reason LIKE $2
          LIMIT 1`,
        inspectionId,
        `%${marker}%`,
      ),
    );
    if (rows[0]) throw new DomainError('INSPECTIONS.DEDUCTION_ALREADY_APPLIED', { marker });
  }

  private async assertNoMaintenanceConflict(
    organizationId: string,
    userId: string,
    inspectionId: string,
    marker: string,
  ): Promise<void> {
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM maintenance_requests WHERE inspection_id = $1::uuid AND description LIKE $2 LIMIT 1`,
        inspectionId,
        `%${marker}%`,
      ),
    );
    if (rows[0]) throw new DomainError('INSPECTIONS.MAINTENANCE_ALREADY_CREATED', { marker });
  }
}
