import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  InspectionsService,
  type InspectionItemInput,
} from '../../inspections/application/inspections.service';
import type { InspectionCondition } from '../../inspections/domain/inspection-rules';
import { classifyDomainError } from '../domain/error-classification';
import type {
  SyncApplyResult,
  SyncErrorVerdict,
  SyncOperationHandler,
} from '../domain/operation-handler';
import type { SyncReader } from '../domain/sync-types';

/** Statuts qui figent un constat : un rejeu n'y touche plus. */
const LOCKED = new Set(['SIGNED', 'DISPUTED', 'CANCELLED']);

/**
 * Charge utile composée par le mobile (`inspection_offline_plan.dart`).
 * `photoDocumentIds` arrive rempli : le moteur de synchronisation remplace
 * chaque `null` par l'identifiant du document une fois la pièce jointe
 * téléversée, avant d'envoyer l'opération dépendante.
 */
const inspectionSubmitSchema = z.object({
  unitId: z.string().uuid(),
  leaseId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  inspectionType: z.enum(['MOVE_IN', 'MOVE_OUT', 'PERIODIC', 'CONTRADICTORY']),
  tenantPresent: z.boolean(),
  absenceReason: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  tenantSignatureDocumentId: z.string().uuid().nullable().optional(),
  agentSignatureDocumentId: z.string().uuid().nullable().optional(),
  items: z
    .array(
      z.object({
        roomLabel: z.string().min(1).max(80),
        elementLabel: z.string().min(1).max(120),
        elementCategory: z.string().max(80).optional(),
        condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', 'MISSING']),
        isDamaged: z.boolean().optional(),
        damageDescription: z.string().max(1000).optional(),
        repairAmount: z.number().int().nonnegative().optional(),
        chargedTo: z.enum(['LANDLORD', 'TENANT', 'ORGANIZATION']).optional(),
        photoDocumentIds: z.array(z.string().uuid().nullable()).default([]),
      }),
    )
    .min(1),
});

/**
 * Gestionnaire `INSPECTION_SUBMIT` : dépôt COMPOSITE d'un état des lieux
 * réalisé hors ligne — en-tête, postes, photos et signature en une seule
 * opération.
 *
 * DIVERGENCE ASSUMÉE avec le contrat de la phase 8, qui pose qu'« un lot ne
 * porte jamais une opération composite » et n'enregistre que la CRÉATION
 * (gestionnaire `INSPECTION`, conservé tel quel). Ce principe est intenable
 * sur ce domaine précis : un constat se fait sur le terrain, sans réseau, et
 * ses postes, ses photos et ses deux signatures forment un tout indivisible.
 * Les découper en appels en ligne ultérieurs revient à exiger une connexion
 * au moment où, par construction, il n'y en a pas.
 *
 * Le mobile composait déjà cette opération (`inspection_offline_plan.dart`)
 * alors que le serveur ne connaissait que `INSPECTION` : tout lot en
 * contenant une était refusé en bloc (422), encaissements compris, la
 * validation portant sur le lot entier. Ce gestionnaire referme cet écart.
 *
 * IDEMPOTENCE, en deux temps. `InspectionsService.create` rejoue par
 * `client_ref` (contrainte d'unicité pleine). Mais `create` n'est que la
 * PREMIÈRE étape : un rejeu après échec partiel retrouve un en-tête qui porte
 * déjà ses postes, et les réinsérer les dupliquerait silencieusement. On
 * s'arrête donc dès qu'un constat est figé, ou dès qu'il porte déjà des
 * postes — reprendre un dépôt interrompu relève d'un gestionnaire, pas d'un
 * rejeu aveugle.
 */
@Injectable()
export class InspectionSubmitOperationHandler implements SyncOperationHandler {
  readonly type = 'INSPECTION_SUBMIT' as const;
  readonly resourceType = 'inspections';

  constructor(
    private readonly inspections: InspectionsService,
    private readonly prisma: PrismaService,
  ) {}

  async apply(
    organizationId: string,
    reader: SyncReader,
    payload: unknown,
    context: { clientRef: string; syncBatchId: string },
  ): Promise<SyncApplyResult> {
    const parsed = inspectionSubmitSchema.safeParse(payload);
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
      tenantPresent: dto.tenantPresent,
      notes: dto.notes ?? null,
      clientRef: context.clientRef,
    });

    if (replayed && (await this.alreadyApplied(organizationId, reader.userId, inspection))) {
      return { replayed: true, resourceId: inspection.id };
    }

    for (const item of dto.items) {
      const created = await this.inspections.addItem(organizationId, reader.userId, inspection.id, {
        roomLabel: item.roomLabel,
        elementLabel: item.elementLabel,
        elementCategory: item.elementCategory ?? null,
        condition: item.condition as InspectionCondition,
        isDamaged: item.isDamaged,
        damageDescription: item.damageDescription ?? null,
        repairAmount: item.repairAmount,
        chargedTo: item.chargedTo,
      } satisfies InspectionItemInput);

      for (const documentId of item.photoDocumentIds) {
        // Un `null` résiduel signifierait une pièce jointe non téléversée ; le
        // tri par dépendances écarte normalement l'opération avant d'en
        // arriver là. On l'ignore plutôt que de refuser tout le constat.
        if (!documentId) continue;
        await this.inspections.addPhoto(organizationId, reader.userId, inspection.id, {
          inspectionItemId: created.id,
          documentId,
        });
      }
    }

    await this.inspections.sign(
      organizationId,
      { userId: reader.userId, role: reader.role },
      inspection.id,
      {
        tenantPresent: dto.tenantPresent,
        absenceReason: dto.absenceReason,
        tenantSignatureDocumentId: dto.tenantSignatureDocumentId ?? undefined,
        agentSignatureDocumentId: dto.agentSignatureDocumentId ?? undefined,
      },
    );

    return { replayed: false, resourceId: inspection.id };
  }

  /** Constat figé, ou portant déjà des postes : le dépôt a déjà eu lieu. */
  private async alreadyApplied(
    organizationId: string,
    userId: string,
    inspection: { id: string; status: string },
  ): Promise<boolean> {
    if (LOCKED.has(inspection.status)) return true;
    const count = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.inspection_items.count({ where: { inspection_id: inspection.id } }),
    );
    return count > 0;
  }

  classify(error: unknown): SyncErrorVerdict | null {
    return classifyDomainError(error);
  }
}
