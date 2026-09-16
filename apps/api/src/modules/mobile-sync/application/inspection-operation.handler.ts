import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DomainError } from '../../../shared/errors/domain-error';
import { InspectionsService } from '../../inspections/application/inspections.service';
import { classifyDomainError } from '../domain/error-classification';
import type {
  SyncApplyResult,
  SyncErrorVerdict,
  SyncOperationHandler,
} from '../domain/operation-handler';
import type { SyncReader } from '../domain/sync-types';

/** Corps identique à `POST /v1/inspections` (contrat phase 8, réutilisation phase 5). */
const inspectionOperationSchema = z.object({
  unitId: z.string().uuid(),
  leaseId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  inspectionType: z.enum(['MOVE_IN', 'MOVE_OUT', 'PERIODIC', 'CONTRADICTORY']),
  scheduledAt: z.string().optional(),
  tenantPresent: z.boolean().optional(),
  landlordPresent: z.boolean().optional(),
  keysHandedCount: z.number().int().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * Gestionnaire `INSPECTION` : réutilise `InspectionsService.create`, qui
 * porte sa propre transaction et l'idempotence par `client_ref`
 * (`inspections_client_ref_uk`, contrainte d'unicité pleine — contrairement
 * à `MAINTENANCE_UPDATE`, voir ce gestionnaire). Enregistre la CRÉATION de
 * l'état des lieux ; postes, photos et signature restent des appels en ligne
 * ultérieurs (même principe que `DOCUMENT` puis `CASH_RECEIPT` : un lot ne
 * porte jamais une opération composite).
 */
@Injectable()
export class InspectionOperationHandler implements SyncOperationHandler {
  readonly type = 'INSPECTION' as const;
  readonly resourceType = 'inspections';

  constructor(private readonly inspections: InspectionsService) {}

  async apply(
    organizationId: string,
    reader: SyncReader,
    payload: unknown,
    context: { clientRef: string; syncBatchId: string },
  ): Promise<SyncApplyResult> {
    const parsed = inspectionOperationSchema.safeParse(payload);
    if (!parsed.success) {
      throw new DomainError('VALIDATION.INVALID_PAYLOAD', {
        fields: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    const dto = parsed.data;
    const { inspection, replayed } = await this.inspections.create(organizationId, reader.userId, {
      unitId: dto.unitId,
      leaseId: dto.leaseId ?? null,
      tenantId: dto.tenantId ?? null,
      inspectionType: dto.inspectionType,
      scheduledAt: dto.scheduledAt ?? null,
      tenantPresent: dto.tenantPresent,
      landlordPresent: dto.landlordPresent,
      keysHandedCount: dto.keysHandedCount,
      notes: dto.notes ?? null,
      clientRef: context.clientRef,
    });
    return { replayed, resourceId: inspection.id };
  }

  classify(error: unknown): SyncErrorVerdict | null {
    return classifyDomainError(error);
  }
}
