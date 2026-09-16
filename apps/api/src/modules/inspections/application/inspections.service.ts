import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DomainError, notFound } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { toAmount } from '../../../shared/money/amount';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { readOperationalSettings } from '../../../shared/settings/operational-settings';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { NumberingService } from '../../numbering/application/numbering.service';
import { InspectionReportPipeline } from '../infrastructure/inspection-report.pipeline';
import {
  assertNotLocked,
  conditionLevel,
  isPhotoRequired,
  nextStatusOnFirstItem,
  type InspectionCondition,
  type InspectionStatus,
} from '../domain/inspection-rules';
import type { InspectionItemRow, InspectionPhotoRow, InspectionRow } from './inspection-views';

export interface InspectionCreateInput {
  unitId: string;
  leaseId?: string | null;
  tenantId?: string | null;
  inspectionType: string;
  scheduledAt?: string | null;
  tenantPresent?: boolean;
  landlordPresent?: boolean;
  keysHandedCount?: number;
  notes?: string | null;
  clientRef?: string | null;
}

export interface InspectionItemInput {
  roomLabel: string;
  elementLabel: string;
  elementCategory?: string | null;
  condition: InspectionCondition;
  quantity?: number;
  isDamaged?: boolean;
  damageDescription?: string | null;
  repairAmount?: number | string;
  chargedTo?: 'LANDLORD' | 'TENANT' | 'ORGANIZATION';
  position?: number;
}

export interface SignInput {
  tenantPresent?: boolean;
  absenceReason?: string;
  tenantSignatureDocumentId?: string;
  agentSignatureDocumentId?: string;
}

const GRACE_DAYS_DEFAULT = 15;

/** Cycle de vie d'un état des lieux : création, postes, signature, verrouillage. */
@Injectable()
export class InspectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbering: NumberingService,
    private readonly auditService: AuditService,
    private readonly reportPipeline: InspectionReportPipeline,
  ) {}

  async create(
    organizationId: string,
    userId: string | null,
    input: InspectionCreateInput,
  ): Promise<{ inspection: InspectionRow; replayed: boolean }> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      if (input.clientRef) {
        const existing = (await tx.inspections.findFirst({
          where: { client_ref: input.clientRef },
        })) as unknown as InspectionRow | null;
        if (existing) return { inspection: existing, replayed: true };
      }
      const unit = await tx.units.findFirst({ where: { id: input.unitId } });
      if (!unit) throw notFound('units', input.unitId);

      const now = new Date();
      const { number } = await this.numbering.nextNumber(tx, organizationId, 'INSPECTION', now);
      const id = newId();
      const created = (await tx.inspections.create({
        data: {
          id,
          organization_id: organizationId,
          lease_id: input.leaseId ?? null,
          unit_id: input.unitId,
          property_id: unit.property_id,
          tenant_id: input.tenantId ?? null,
          reference: number,
          inspection_type: input.inspectionType as never,
          status: 'DRAFT',
          scheduled_at: input.scheduledAt ? new Date(input.scheduledAt) : null,
          tenant_present: input.tenantPresent ?? true,
          landlord_present: input.landlordPresent ?? false,
          keys_handed_count: input.keysHandedCount ?? null,
          performed_by_user_id: userId,
          notes: input.notes ?? null,
          client_ref: input.clientRef ?? null,
        },
      })) as unknown as InspectionRow;

      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.INSPECTION_CREATED,
        entityType: 'inspections',
        entityId: id,
        newState: toJsonState({ reference: number, inspectionType: input.inspectionType }),
      });
      return { inspection: created, replayed: false };
    });
  }

  async addItem(
    organizationId: string,
    userId: string,
    inspectionId: string,
    input: InspectionItemInput,
  ): Promise<InspectionItemRow> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const inspection = await this.loadOrThrow(tx, inspectionId);
      assertNotLocked(inspection.status as InspectionStatus);

      const id = newId();
      const item = (await tx.inspection_items.create({
        data: {
          id,
          organization_id: organizationId,
          inspection_id: inspectionId,
          room_label: input.roomLabel,
          element_label: input.elementLabel,
          element_category: input.elementCategory ?? null,
          condition: input.condition as never,
          quantity: input.quantity ?? 1,
          is_damaged: input.isDamaged ?? (input.condition !== 'NEW' && input.condition !== 'GOOD'),
          damage_description: input.damageDescription ?? null,
          repair_amount: toAmount(input.repairAmount ?? 0),
          charged_to: (input.chargedTo ?? 'TENANT') as never,
          position: input.position ?? 0,
        },
      })) as unknown as InspectionItemRow;

      const nextStatus = nextStatusOnFirstItem(inspection.status as InspectionStatus);
      if (nextStatus !== inspection.status) {
        await tx.inspections.update({ where: { id: inspectionId }, data: { status: nextStatus } });
      }

      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.INSPECTION_ITEM_ADDED,
        entityType: 'inspection_items',
        entityId: id,
        newState: toJsonState({ roomLabel: input.roomLabel, elementLabel: input.elementLabel }),
      });
      return item;
    });
  }

  async updateItem(
    organizationId: string,
    userId: string,
    inspectionId: string,
    itemId: string,
    input: Partial<InspectionItemInput>,
  ): Promise<InspectionItemRow> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const inspection = await this.loadOrThrow(tx, inspectionId);
      assertNotLocked(inspection.status as InspectionStatus);
      const before = await tx.inspection_items.findFirst({
        where: { id: itemId, inspection_id: inspectionId },
      });
      if (!before) throw notFound('inspection_items', itemId);

      const after = (await tx.inspection_items.update({
        where: { id: itemId },
        data: {
          ...(input.roomLabel !== undefined ? { room_label: input.roomLabel } : {}),
          ...(input.elementLabel !== undefined ? { element_label: input.elementLabel } : {}),
          ...(input.elementCategory !== undefined
            ? { element_category: input.elementCategory }
            : {}),
          ...(input.condition !== undefined ? { condition: input.condition as never } : {}),
          ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
          ...(input.isDamaged !== undefined ? { is_damaged: input.isDamaged } : {}),
          ...(input.damageDescription !== undefined
            ? { damage_description: input.damageDescription }
            : {}),
          ...(input.repairAmount !== undefined
            ? { repair_amount: toAmount(input.repairAmount) }
            : {}),
          ...(input.chargedTo !== undefined ? { charged_to: input.chargedTo as never } : {}),
          ...(input.position !== undefined ? { position: input.position } : {}),
          updated_at: new Date(),
        },
      })) as unknown as InspectionItemRow;

      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.INSPECTION_ITEM_UPDATED,
        entityType: 'inspection_items',
        entityId: itemId,
        previousState: toJsonState(before),
        newState: toJsonState(after),
      });
      return after;
    });
  }

  async deleteItem(
    organizationId: string,
    userId: string,
    inspectionId: string,
    itemId: string,
  ): Promise<void> {
    await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const inspection = await this.loadOrThrow(tx, inspectionId);
      assertNotLocked(inspection.status as InspectionStatus);
      const before = await tx.inspection_items.findFirst({
        where: { id: itemId, inspection_id: inspectionId },
      });
      if (!before) throw notFound('inspection_items', itemId);
      await tx.inspection_items.delete({ where: { id: itemId } });
      await audit(this.auditService, tx, {
        action: 'DELETE',
        operation: AUDIT_OPERATIONS.INSPECTION_ITEM_REMOVED,
        entityType: 'inspection_items',
        entityId: itemId,
        previousState: toJsonState(before),
      });
    });
  }

  async addPhoto(
    organizationId: string,
    userId: string,
    inspectionId: string,
    input: {
      inspectionItemId?: string | null;
      documentId: string;
      caption?: string | null;
      takenAt?: string | null;
      checksumSha256?: string | null;
      position?: number;
      clientRef?: string | null;
    },
  ): Promise<InspectionPhotoRow> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const inspection = await this.loadOrThrow(tx, inspectionId);
      assertNotLocked(inspection.status as InspectionStatus);
      const id = newId();
      const photo = (await tx.inspection_photos.create({
        data: {
          id,
          organization_id: organizationId,
          inspection_id: inspectionId,
          inspection_item_id: input.inspectionItemId ?? null,
          document_id: input.documentId,
          caption: input.caption ?? null,
          taken_at: input.takenAt ? new Date(input.takenAt) : null,
          checksum_sha256: input.checksumSha256 ?? null,
          position: input.position ?? 0,
          client_ref: input.clientRef ?? null,
        },
      })) as unknown as InspectionPhotoRow;
      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.INSPECTION_PHOTO_ATTACHED,
        entityType: 'inspection_photos',
        entityId: id,
        newState: toJsonState({ inspectionItemId: input.inspectionItemId ?? null }),
      });
      return photo;
    });
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    input: Partial<InspectionCreateInput>,
  ): Promise<InspectionRow> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.loadOrThrow(tx, id);
      assertNotLocked(before.status as InspectionStatus);
      const after = (await tx.inspections.update({
        where: { id },
        data: {
          ...(input.scheduledAt !== undefined
            ? { scheduled_at: input.scheduledAt ? new Date(input.scheduledAt) : null }
            : {}),
          ...(input.tenantPresent !== undefined ? { tenant_present: input.tenantPresent } : {}),
          ...(input.landlordPresent !== undefined
            ? { landlord_present: input.landlordPresent }
            : {}),
          ...(input.keysHandedCount !== undefined
            ? { keys_handed_count: input.keysHandedCount }
            : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          updated_at: new Date(),
        },
      })) as unknown as InspectionRow;
      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.INSPECTION_UPDATED,
        entityType: 'inspections',
        entityId: id,
        previousState: toJsonState(before),
        newState: toJsonState(after),
      });
      return after;
    });
  }

  async sign(
    organizationId: string,
    actor: { userId: string; role: string },
    id: string,
    input: SignInput,
  ): Promise<InspectionRow> {
    return this.prisma.withTenant(organizationId, actor.userId, async (tx) => {
      const inspection = await this.loadOrThrow(tx, id);
      if (['SIGNED', 'DISPUTED', 'CANCELLED'].includes(inspection.status)) {
        throw new DomainError('INSPECTIONS.LOCKED', { status: inspection.status });
      }

      const settings = await tx.organization_settings.findUnique({
        where: { organization_id: organizationId },
      });
      const facilities = readOperationalSettings(settings?.settings_json ?? null).facilities;
      await this.assertPhotosPresent(tx, id, facilities.inspectionPhotoRequiredFrom);

      const items = await tx.inspection_items.findMany({ where: { inspection_id: id } });
      const totalDamage = items.reduce((sum, item) => sum + item.repair_amount, 0n);
      const worst = items.reduce<InspectionCondition | null>((acc, item) => {
        const c = item.condition as InspectionCondition;
        return !acc || conditionLevel(c) > conditionLevel(acc) ? c : acc;
      }, null);

      const now = new Date();
      let data: Record<string, unknown>;

      if (input.tenantPresent === false) {
        if (!input.absenceReason?.trim()) {
          throw new DomainError('INSPECTIONS.TENANT_ABSENCE_REASON_REQUIRED', {});
        }
        data = {
          tenant_present: false,
          agent_signed_at: now,
          signature_document_id: input.agentSignatureDocumentId ?? null,
          status: 'PENDING_SIGNATURE',
          notes: appendNote(inspection.notes, `Absence locataire : ${input.absenceReason}`),
        };
      } else if (inspection.status === 'PENDING_SIGNATURE') {
        if (input.tenantSignatureDocumentId) {
          data = {
            tenant_signed_at: now,
            signature_document_id: input.tenantSignatureDocumentId,
            status: 'SIGNED',
          };
        } else {
          const graceElapsedMs = GRACE_DAYS_DEFAULT * 86_400_000;
          const since = inspection.agent_signed_at?.getTime() ?? 0;
          const canOverride = actor.role === 'MANAGER' || actor.role === 'OWNER';
          if (!canOverride || now.getTime() - since < graceElapsedMs) {
            throw new DomainError('INSPECTIONS.SIGNATURE_GRACE_NOT_ELAPSED', {});
          }
          data = {
            status: 'SIGNED',
            notes: appendNote(
              inspection.notes,
              'Clôturé par un manager, locataire absent au-delà du délai de grâce.',
            ),
          };
        }
      } else {
        data = {
          tenant_signed_at: now,
          agent_signed_at: now,
          signature_document_id:
            input.tenantSignatureDocumentId ?? input.agentSignatureDocumentId ?? null,
          status: 'SIGNED',
        };
      }

      data.total_damage_amount = totalDamage;
      if (worst) data.overall_condition = worst;
      data.signature_hash = createHash('sha256')
        .update(
          `${id}|${input.tenantSignatureDocumentId ?? ''}|${input.agentSignatureDocumentId ?? ''}`,
        )
        .digest('hex');
      data.performed_at = inspection.performed_at ?? now;
      data.updated_at = now;

      const after = (await tx.inspections.update({
        where: { id },
        data,
      })) as unknown as InspectionRow;

      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.INSPECTION_SIGNED,
        entityType: 'inspections',
        entityId: id,
        previousState: toJsonState({ status: inspection.status }),
        newState: toJsonState({ status: after.status }),
      });
      if (after.status === 'SIGNED') {
        await this.reportPipeline.enqueue(organizationId, id).catch(() => undefined);
      }
      return after;
    });
  }

  async dispute(
    organizationId: string,
    userId: string,
    id: string,
    reason: string,
  ): Promise<InspectionRow> {
    if (!reason?.trim()) throw new DomainError('INSPECTIONS.DISPUTE_REASON_REQUIRED', {});
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.loadOrThrow(tx, id);
      const after = (await tx.inspections.update({
        where: { id },
        data: { status: 'DISPUTED', dispute_reason: reason, updated_at: new Date() },
      })) as unknown as InspectionRow;
      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.INSPECTION_DISPUTED,
        entityType: 'inspections',
        entityId: id,
        previousState: toJsonState({ status: before.status }),
        newState: toJsonState({ status: 'DISPUTED', reason }),
      });
      return after;
    });
  }

  async cancel(organizationId: string, userId: string, id: string): Promise<InspectionRow> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.loadOrThrow(tx, id);
      const after = (await tx.inspections.update({
        where: { id },
        data: { status: 'CANCELLED', updated_at: new Date() },
      })) as unknown as InspectionRow;
      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.INSPECTION_CANCELLED,
        entityType: 'inspections',
        entityId: id,
        previousState: toJsonState({ status: before.status }),
        newState: toJsonState({ status: 'CANCELLED' }),
      });
      return after;
    });
  }

  private async loadOrThrow(tx: TenantClient, id: string): Promise<InspectionRow> {
    const row = (await tx.inspections.findFirst({
      where: { id },
    })) as unknown as InspectionRow | null;
    if (!row) throw notFound('inspections', id);
    return row;
  }

  private async assertPhotosPresent(
    tx: TenantClient,
    inspectionId: string,
    requiredFrom: 'POOR' | 'DAMAGED',
  ): Promise<void> {
    const items = await tx.inspection_items.findMany({ where: { inspection_id: inspectionId } });
    for (const item of items) {
      if (!isPhotoRequired(item.condition as InspectionCondition, requiredFrom)) continue;
      const count = await tx.inspection_photos.count({ where: { inspection_item_id: item.id } });
      if (count === 0) {
        throw new DomainError('INSPECTIONS.PHOTO_REQUIRED', {
          itemId: item.id,
          roomLabel: item.room_label,
          elementLabel: item.element_label,
          condition: item.condition,
        });
      }
    }
  }
}

function appendNote(existing: string | null, addition: string): string {
  return existing ? `${existing}\n${addition}` : addition;
}
