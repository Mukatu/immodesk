import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DomainError } from '../../../shared/errors/domain-error';
import { MaintenanceRequestsService } from '../../maintenance/application/maintenance-requests.service';
import { classifyDomainError } from '../domain/error-classification';
import type {
  SyncApplyResult,
  SyncErrorVerdict,
  SyncOperationHandler,
} from '../domain/operation-handler';
import type { SyncReader } from '../domain/sync-types';

/**
 * Corps identique à `POST /v1/maintenance-requests/{id}/updates`, complété
 * de `requestId` (segment de chemin de la route en ligne).
 */
const maintenanceUpdateOperationSchema = z.object({
  requestId: z.string().uuid(),
  newStatus: z
    .enum([
      'OPEN',
      'ACKNOWLEDGED',
      'ASSIGNED',
      'IN_PROGRESS',
      'ON_HOLD',
      'RESOLVED',
      'CLOSED',
      'REJECTED',
    ])
    .optional(),
  message: z.string().max(1000).optional(),
  photoDocumentId: z.string().uuid().optional(),
  amountDelta: z.union([z.number(), z.string()]).optional(),
  isVisibleToTenant: z.boolean().optional(),
  expenseId: z.string().uuid().optional(),
});

/**
 * Gestionnaire `MAINTENANCE_UPDATE` : réutilise `MaintenanceRequestsService
 * .addUpdate`.
 *
 * ÉCART DOCUMENTÉ AU CONTRAT DE LA PHASE 5 — `maintenance_updates` ne porte
 * AUCUNE contrainte d'unicité sur `client_ref` (le DDL de la phase 8, fermé,
 * n'en ajoute pas). L'arbitrage 1 du contrat phase 5 promet que « la
 * contrainte d'unicité (organization_id, client_ref) garantit l'absence de
 * doublon » pour tout type enregistré : ce n'est vrai ici qu'au niveau
 * APPLICATIF (recherche préalable par `request_id` + `client_ref` dans
 * `addUpdate`, sous la même transaction), pas au niveau de la base. Un rejeu
 * strictement concurrent du même lot (deux requêtes simultanées) pourrait
 * donc, en théorie, créer deux lignes d'historique identiques — un risque
 * que `CASH_RECEIPT` et `METER_READING` n'ont pas. Le signaler ici plutôt que
 * de le taire : l'idempotence de ce gestionnaire est plus faible que celle
 * des deux autres.
 */
@Injectable()
export class MaintenanceUpdateOperationHandler implements SyncOperationHandler {
  readonly type = 'MAINTENANCE_UPDATE' as const;
  readonly resourceType = 'maintenance_updates';

  constructor(private readonly maintenance: MaintenanceRequestsService) {}

  async apply(
    organizationId: string,
    reader: SyncReader,
    payload: unknown,
    context: { clientRef: string; syncBatchId: string },
  ): Promise<SyncApplyResult> {
    const parsed = maintenanceUpdateOperationSchema.safeParse(payload);
    if (!parsed.success) {
      throw new DomainError('VALIDATION.INVALID_PAYLOAD', {
        fields: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    const dto = parsed.data;
    const { update, replayed } = await this.maintenance.addUpdate(
      organizationId,
      reader.userId,
      dto.requestId,
      {
        newStatus: dto.newStatus,
        message: dto.message ?? null,
        photoDocumentId: dto.photoDocumentId ?? null,
        amountDelta: dto.amountDelta,
        isVisibleToTenant: dto.isVisibleToTenant,
        expenseId: dto.expenseId ?? null,
        clientRef: context.clientRef,
      },
    );
    return { replayed, resourceId: update.id };
  }

  classify(error: unknown): SyncErrorVerdict | null {
    return classifyDomainError(error);
  }
}
