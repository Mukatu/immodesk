import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DocumentsService } from '../../documents/application/documents.service';
import { DOCUMENT_KINDS, RELATED_ENTITY_TYPES } from '../../documents/domain/document-rules';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { isUniqueViolation } from '../../../shared/prisma/sql-errors';
import type {
  SyncApplyResult,
  SyncErrorVerdict,
  SyncOperationHandler,
} from '../domain/operation-handler';
import { classifyDomainError } from '../domain/error-classification';
import type { SyncReader } from '../domain/sync-types';

/**
 * Corps identique à `POST /v1/documents` (docs/api/phase5-contract.md,
 * « Pièces jointes hors ligne ») : l'objet a déjà été envoyé au stockage par
 * `POST /v1/documents/upload-url` puis un PUT signé, EN LIGNE, au moment de
 * la synchronisation — les deux exigent une connexion, dont on dispose déjà
 * puisque le lot lui-même est en train d'être envoyé. Cette opération se
 * limite donc à enregistrer la fiche, exactement comme la route en ligne.
 */
const documentOperationSchema = z.object({
  objectKey: z.string().min(1),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  kind: z.enum(DOCUMENT_KINDS),
  relatedEntityType: z.enum(RELATED_ENTITY_TYPES).optional(),
  relatedEntityId: z.string().uuid().optional(),
  checksumSha256: z.string().optional(),
});

@Injectable()
export class DocumentOperationHandler implements SyncOperationHandler {
  readonly type = 'DOCUMENT' as const;
  readonly resourceType = 'documents';

  constructor(
    private readonly documents: DocumentsService,
    private readonly prisma: PrismaService,
  ) {}

  async apply(
    organizationId: string,
    reader: SyncReader,
    payload: unknown,
    context: { clientRef: string },
  ): Promise<SyncApplyResult> {
    const parsed = documentOperationSchema.safeParse(payload);
    if (!parsed.success) {
      throw new DomainError('VALIDATION.INVALID_PAYLOAD', {
        fields: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }

    const existing = await this.findByClientRef(organizationId, reader.userId, context.clientRef);
    if (existing) return { replayed: true, resourceId: existing };

    try {
      const created = await this.documents.register(organizationId, reader.userId, {
        ...parsed.data,
        clientRef: context.clientRef,
      });
      return { replayed: false, resourceId: created.id };
    } catch (error) {
      if (isUniqueViolation(error, 'client_ref')) {
        const again = await this.findByClientRef(organizationId, reader.userId, context.clientRef);
        if (again) return { replayed: true, resourceId: again };
      }
      throw error;
    }
  }

  classify(error: unknown): SyncErrorVerdict | null {
    return classifyDomainError(error);
  }

  private async findByClientRef(
    organizationId: string,
    userId: string,
    clientRef: string,
  ): Promise<string | null> {
    const found = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.documents.findFirst({ where: { client_ref: clientRef }, select: { id: true } }),
    );
    return found?.id ?? null;
  }
}
