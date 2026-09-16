import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DomainError } from '../../../shared/errors/domain-error';
import { MeterReadingsService } from '../../meters/application/meter-readings.service';
import { classifyDomainError } from '../domain/error-classification';
import type {
  SyncApplyResult,
  SyncErrorVerdict,
  SyncOperationHandler,
} from '../domain/operation-handler';
import type { SyncReader } from '../domain/sync-types';

/**
 * Corps identique à `POST /v1/meters/{id}/readings`, complété du
 * seul champ que la route en ligne porte dans le CHEMIN et non dans le
 * corps : `meterId`. C'est l'unique adaptation qu'impose la généricité de
 * l'enveloppe de synchronisation, qui ne connaît pas de segment de chemin.
 */
const meterReadingOperationSchema = z.object({
  meterId: z.string().uuid(),
  readingDate: z.string(),
  currentIndex: z.number(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  rolloverApplied: z.boolean().optional(),
  isEstimated: z.boolean().optional(),
  photoDocumentId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Gestionnaire `METER_READING` : réutilise `MeterReadingsService.create`,
 * idempotent par construction (`meter_readings_client_ref_uk`, unicité pleine
 * `(organization_id, client_ref)`). Un index régressif sans `rolloverApplied`
 * est un rejet DÉFINITIF (`METERS.INDEX_REGRESSION`), jamais un conflit : ce
 * n'est pas un changement survenu côté serveur pendant la coupure.
 */
@Injectable()
export class MeterReadingOperationHandler implements SyncOperationHandler {
  readonly type = 'METER_READING' as const;
  readonly resourceType = 'meter_readings';

  constructor(private readonly readings: MeterReadingsService) {}

  async apply(
    organizationId: string,
    reader: SyncReader,
    payload: unknown,
    context: { clientRef: string; syncBatchId: string },
  ): Promise<SyncApplyResult> {
    const parsed = meterReadingOperationSchema.safeParse(payload);
    if (!parsed.success) {
      throw new DomainError('VALIDATION.INVALID_PAYLOAD', {
        fields: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    const dto = parsed.data;
    const { reading, replayed } = await this.readings.create(
      organizationId,
      reader.userId,
      dto.meterId,
      {
        readingDate: dto.readingDate,
        currentIndex: dto.currentIndex,
        periodStart: dto.periodStart ?? null,
        periodEnd: dto.periodEnd ?? null,
        rolloverApplied: dto.rolloverApplied,
        isEstimated: dto.isEstimated,
        photoDocumentId: dto.photoDocumentId ?? null,
        notes: dto.notes ?? null,
        clientRef: context.clientRef,
      },
    );
    return { replayed, resourceId: reading.id };
  }

  classify(error: unknown): SyncErrorVerdict | null {
    return classifyDomainError(error);
  }
}
