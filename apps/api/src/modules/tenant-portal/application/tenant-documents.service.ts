import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import type { TenantLeaseRow } from '../../../shared/prisma/tenant-directory.service';
import {
  DocumentsService,
  type DocumentView,
  type RegisterDocumentInput,
  type UploadUrlInput,
} from '../../documents/application/documents.service';

/**
 * Téléversement de la preuve de virement par le locataire (contrat, § « Téléversement
 * de la preuve par le locataire ») : les routes du module `documents` sont
 * réservées au rôle `MANAGER` (`@Roles('MANAGER')` posé sur `DocumentsController`,
 * jamais touché ici), mais `DocumentsService` lui-même n'impose aucun rôle —
 * seul le contrôleur le fait. Ces deux routes jumelles appellent donc
 * directement `DocumentsService` (module `documents`, `@Global()`), sans
 * aucune modification de ce module, en imposant ICI la seule règle du
 * contrat : `related_entity_type = 'lease'` et un `related_entity_id`
 * appartenant au périmètre de la session — toute autre valeur (un autre
 * type, ou un bail qui n'est pas le sien) est refusée AVANT tout appel au
 * stockage, avec le code réservé à cette validation
 * (`PARTIES.PORTAL_RELATED_ENTITY_INVALID`, 422 — jamais le 404 générique de
 * cloisonnement, cette route n'étant pas une LECTURE hors périmètre mais un
 * REFUS d'écriture).
 */
@Injectable()
export class TenantDocumentsService {
  constructor(private readonly documents: DocumentsService) {}

  async createUploadUrl(
    leases: readonly TenantLeaseRow[],
    userId: string,
    input: UploadUrlInput,
  ): Promise<{ uploadUrl: string; objectKey: string; expiresAt: string; maxSizeBytes: number }> {
    const lease = this.resolveLease(leases, input.relatedEntityType, input.relatedEntityId);
    return this.documents.createUploadUrl(lease.organizationId, userId, input);
  }

  async register(
    leases: readonly TenantLeaseRow[],
    userId: string,
    input: RegisterDocumentInput,
  ): Promise<DocumentView> {
    const lease = this.resolveLease(leases, input.relatedEntityType, input.relatedEntityId);
    return this.documents.register(lease.organizationId, userId, input);
  }

  private resolveLease(
    leases: readonly TenantLeaseRow[],
    relatedEntityType: string | null | undefined,
    relatedEntityId: string | null | undefined,
  ): TenantLeaseRow {
    if (relatedEntityType !== 'lease' || !relatedEntityId) {
      throw new DomainError('PARTIES.PORTAL_RELATED_ENTITY_INVALID', { relatedEntityType });
    }
    const found = leases.find((l) => l.leaseId === relatedEntityId);
    if (!found) {
      throw new DomainError('PARTIES.PORTAL_RELATED_ENTITY_INVALID', { relatedEntityId });
    }
    return found;
  }
}
