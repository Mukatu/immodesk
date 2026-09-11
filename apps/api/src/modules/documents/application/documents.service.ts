import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { toJsonAmount } from '../../../shared/money/amount';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import {
  assertObjectKeyBelongsTo,
  assertUploadAllowed,
  buildObjectKey,
  sanitizeFileName,
  SIGNED_URL_TTL_SECONDS,
  type DocumentKind,
  type RelatedEntityType,
} from '../domain/document-rules';
import { OBJECT_STORAGE, type ObjectStorage } from '../domain/storage.port';

export interface UploadUrlInput {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: DocumentKind;
  relatedEntityType?: RelatedEntityType | null;
  relatedEntityId?: string | null;
}

export interface RegisterDocumentInput {
  objectKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: DocumentKind;
  relatedEntityType?: RelatedEntityType | null;
  relatedEntityId?: string | null;
  checksumSha256?: string | null;
  clientRef?: string | null;
}

interface DocumentRow {
  id: string;
  kind: string;
  file_name: string;
  mime_type: string;
  size_bytes: bigint;
  width_px: number | null;
  height_px: number | null;
  pages_count: number | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  uploaded_by_user_id: string | null;
  uploaded_at: Date;
  retention_until: Date | null;
  deleted_at: Date | null;
}

export interface DocumentView {
  id: string;
  kind: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  widthPx: number | null;
  heightPx: number | null;
  pagesCount: number | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  uploadedByUserId: string | null;
  uploadedAt: string;
  retentionUntil: string | null;
  deletedAt: string | null;
}

export function toDocumentView(row: DocumentRow): DocumentView {
  return {
    id: row.id,
    kind: row.kind,
    fileName: row.file_name,
    mimeType: row.mime_type,
    // `size_bytes` est un BIGINT, converti en entier JSON sous la même garde
    // que les montants : le contrat type `sizeBytes: number`.
    sizeBytes: toJsonAmount(row.size_bytes),
    widthPx: row.width_px,
    heightPx: row.height_px,
    pagesCount: row.pages_count,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    uploadedByUserId: row.uploaded_by_user_id,
    uploadedAt: row.uploaded_at.toISOString(),
    retentionUntil: row.retention_until ? row.retention_until.toISOString().slice(0, 10) : null,
    deletedAt: row.deleted_at ? row.deleted_at.toISOString() : null,
  };
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly config: AppConfigService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  /**
   * Étape 1 : URL signée d'envoi PUT.
   *
   * L'identifiant du document et sa clé d'objet sont décidés ICI, pas par le
   * client : une clé choisie par l'appelant serait une porte ouverte vers le
   * préfixe d'une autre organisation. Aucune ligne n'est encore écrite en
   * base — un téléversement abandonné ne laisse pas de fiche fantôme.
   */
  async createUploadUrl(
    organizationId: string,
    userId: string,
    input: UploadUrlInput,
  ): Promise<{ uploadUrl: string; objectKey: string; expiresAt: string; maxSizeBytes: number }> {
    const maxSizeBytes = assertUploadAllowed(input.mimeType, input.sizeBytes);
    const documentId = newId();
    const objectKey = buildObjectKey({
      organizationId,
      documentId,
      kind: input.kind,
      mimeType: input.mimeType,
    });

    const presigned = await this.storage.createUploadUrl({
      objectKey,
      mimeType: input.mimeType.trim().toLowerCase(),
      ttlSeconds: this.config.get('S3_UPLOAD_URL_TTL_SECONDS'),
    });

    await this.prisma.withTenant(organizationId, userId, (tx) =>
      audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.DOCUMENT_UPLOAD_URL_ISSUED,
        entityType: 'documents',
        entityId: documentId,
        newState: toJsonState({
          objectKey,
          kind: input.kind,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          fileName: sanitizeFileName(input.fileName),
        }),
      }),
    );

    return { ...presigned, maxSizeBytes };
  }

  /**
   * Étape 2 : enregistrement de la fiche, APRÈS vérification HEAD que l'objet
   * existe réellement dans le bucket. La taille retenue est celle constatée
   * dans le stockage, pas celle annoncée par le client.
   */
  async register(
    organizationId: string,
    userId: string,
    input: RegisterDocumentInput,
  ): Promise<DocumentView> {
    assertObjectKeyBelongsTo(input.objectKey, organizationId);
    assertUploadAllowed(input.mimeType, input.sizeBytes);

    const stored = await this.storage.headObject(input.objectKey);
    if (!stored) {
      throw new DomainError('DOCUMENTS.OBJECT_MISSING', { objectKey: input.objectKey });
    }
    const sizeBytes = stored.sizeBytes > 0 ? stored.sizeBytes : input.sizeBytes;
    assertUploadAllowed(input.mimeType, sizeBytes);

    // L'identifiant est celui encodé dans la clé : la fiche et l'objet
    // portent ainsi le même UUID, ce qui rend la purge et l'audit lisibles.
    const id = documentIdFromKey(input.objectKey) ?? newId();

    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const created = (await tx.documents.create({
        data: {
          id,
          organization_id: organizationId,
          kind: input.kind,
          storage_provider: this.storage.provider,
          bucket: this.storage.bucket,
          object_key: input.objectKey,
          file_name: sanitizeFileName(input.fileName),
          mime_type: input.mimeType.trim().toLowerCase(),
          size_bytes: BigInt(sizeBytes),
          checksum_sha256: input.checksumSha256 ?? stored.checksumSha256,
          related_entity_type: input.relatedEntityType ?? null,
          related_entity_id: input.relatedEntityId ?? null,
          uploaded_by_user_id: userId,
          client_ref: input.clientRef ?? null,
        },
      })) as unknown as DocumentRow;

      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.DOCUMENT_REGISTERED,
        entityType: 'documents',
        entityId: id,
        newState: toJsonState(toDocumentView(created)),
      });
      return toDocumentView(created);
    });
  }

  /**
   * Enregistre un document ENGENDRÉ par l'API (contrat PDF, quittance) dans
   * une transaction DÉJÀ ouverte.
   *
   * L'objet est déposé d'abord, la fiche ensuite, toutes deux dans la
   * transaction de l'appelant : si l'archivage du `lease_documents` échoue,
   * la fiche est annulée avec lui. Il ne reste alors qu'un objet orphelin
   * dans le bucket, que la purge ramassera — un octet perdu est préférable à
   * une fiche pointant vers un fichier qui n'existe pas.
   */
  async registerGenerated(
    tx: TenantClient,
    organizationId: string,
    userId: string | null,
    input: {
      kind: DocumentKind;
      fileName: string;
      mimeType: string;
      body: Buffer;
      relatedEntityType?: string | null;
      relatedEntityId?: string | null;
      checksumSha256?: string | null;
    },
  ): Promise<DocumentView> {
    assertUploadAllowed(input.mimeType, input.body.byteLength);
    const documentId = newId();
    const objectKey = buildObjectKey({
      organizationId,
      documentId,
      kind: input.kind,
      mimeType: input.mimeType,
    });

    const stored = await this.storage.putObject({
      objectKey,
      mimeType: input.mimeType,
      body: input.body,
    });

    const created = (await tx.documents.create({
      data: {
        id: documentId,
        organization_id: organizationId,
        kind: input.kind,
        storage_provider: this.storage.provider,
        bucket: this.storage.bucket,
        object_key: objectKey,
        file_name: sanitizeFileName(input.fileName),
        mime_type: input.mimeType,
        size_bytes: BigInt(stored.sizeBytes),
        checksum_sha256: input.checksumSha256 ?? null,
        related_entity_type: input.relatedEntityType ?? null,
        related_entity_id: input.relatedEntityId ?? null,
        uploaded_by_user_id: userId,
      },
    })) as unknown as DocumentRow;

    await audit(this.auditService, tx, {
      organizationId,
      actorUserId: userId,
      action: 'CREATE',
      operation: AUDIT_OPERATIONS.DOCUMENT_REGISTERED,
      entityType: 'documents',
      entityId: documentId,
      newState: toJsonState({ ...toDocumentView(created), generated: true }),
    });
    return toDocumentView(created);
  }

  /**
   * Dépose un objet engendré par l'API AVANT toute transaction.
   *
   * Un encaissement terrain téléverse la signature du locataire : l'envoi
   * vers le stockage ne doit pas immobiliser une connexion PostgreSQL. La
   * fiche est ensuite écrite par `registerStoredObject` dans la transaction
   * métier ; si celle-ci échoue, l'objet orphelin est ramassé par la purge.
   */
  async storeGeneratedObject(
    organizationId: string,
    input: { kind: DocumentKind; mimeType: string; body: Buffer },
  ): Promise<{ documentId: string; objectKey: string; sizeBytes: number }> {
    assertUploadAllowed(input.mimeType, input.body.byteLength);
    const documentId = newId();
    const objectKey = buildObjectKey({
      organizationId,
      documentId,
      kind: input.kind,
      mimeType: input.mimeType,
    });
    const stored = await this.storage.putObject({
      objectKey,
      mimeType: input.mimeType,
      body: input.body,
    });
    return { documentId, objectKey, sizeBytes: stored.sizeBytes };
  }

  /** Écrit la fiche d'un objet déposé par `storeGeneratedObject`, dans la transaction ouverte. */
  async registerStoredObject(
    tx: TenantClient,
    organizationId: string,
    userId: string | null,
    stored: { documentId: string; objectKey: string; sizeBytes: number },
    input: {
      kind: DocumentKind;
      fileName: string;
      mimeType: string;
      relatedEntityType?: string | null;
      relatedEntityId?: string | null;
      checksumSha256?: string | null;
    },
    metadata?: Record<string, unknown>,
  ): Promise<DocumentView> {
    const created = (await tx.documents.create({
      data: {
        ...(metadata ? { metadata: metadata as object } : {}),
        id: stored.documentId,
        organization_id: organizationId,
        kind: input.kind,
        storage_provider: this.storage.provider,
        bucket: this.storage.bucket,
        object_key: stored.objectKey,
        file_name: sanitizeFileName(input.fileName),
        mime_type: input.mimeType,
        size_bytes: BigInt(stored.sizeBytes),
        checksum_sha256: input.checksumSha256 ?? null,
        related_entity_type: input.relatedEntityType ?? null,
        related_entity_id: input.relatedEntityId ?? null,
        uploaded_by_user_id: userId,
      },
    })) as unknown as DocumentRow;
    await audit(this.auditService, tx, {
      organizationId,
      actorUserId: userId,
      action: 'CREATE',
      operation: AUDIT_OPERATIONS.DOCUMENT_REGISTERED,
      entityType: 'documents',
      entityId: stored.documentId,
      newState: toJsonState({ ...toDocumentView(created), generated: true }),
    });
    return toDocumentView(created);
  }

  /** URL signée pour un lien public vérifié (lien court des SMS), sans utilisateur. */
  async systemDownloadUrl(
    organizationId: string,
    documentId: string,
    ttlSeconds = SIGNED_URL_TTL_SECONDS,
  ): Promise<{ downloadUrl: string; expiresAt: string } | null> {
    return this.prisma.withTenant(organizationId, null, (tx) =>
      this.signedLinkFor(tx, documentId, ttlSeconds),
    );
  }

  /** URL signée d'un document connu, sans audit : liens des messages sortants. */
  async signedLinkFor(
    tx: TenantClient,
    documentId: string,
    ttlSeconds: number,
  ): Promise<{ downloadUrl: string; expiresAt: string } | null> {
    const found = await tx.documents.findFirst({
      where: { id: documentId, deleted_at: null },
      select: { object_key: true, file_name: true },
    });
    if (!found) return null;
    return this.storage.createDownloadUrl({
      objectKey: found.object_key,
      fileName: found.file_name,
      ttlSeconds,
    });
  }

  async list(
    organizationId: string,
    userId: string,
    filters: { relatedEntityType?: string; relatedEntityId?: string; kind?: string },
  ): Promise<DocumentView[]> {
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.documents.findMany({
        where: {
          deleted_at: null,
          ...(filters.relatedEntityType ? { related_entity_type: filters.relatedEntityType } : {}),
          ...(filters.relatedEntityId ? { related_entity_id: filters.relatedEntityId } : {}),
          ...(filters.kind ? { kind: filters.kind as never } : {}),
        },
        orderBy: { uploaded_at: 'desc' },
        take: 200,
      }),
    );
    return (rows as unknown as DocumentRow[]).map(toDocumentView);
  }

  /** Implémentation du port `DocumentReader` consommé par `parties`. */
  async listFor(
    tx: TenantClient,
    relatedEntityType: string,
    relatedEntityId: string,
  ): Promise<DocumentView[]> {
    const rows = (await tx.documents.findMany({
      where: {
        deleted_at: null,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId,
      },
      orderBy: { uploaded_at: 'desc' },
    })) as unknown as DocumentRow[];
    return rows.map(toDocumentView);
  }

  /**
   * URL signée de téléchargement, 10 minutes.
   *
   * Le document d'une autre organisation est invisible sous RLS : la lecture
   * ne ramène rien et le contrat impose alors 404, jamais 403.
   */
  async createDownloadUrl(
    organizationId: string,
    userId: string,
    id: string,
    ttlSeconds = SIGNED_URL_TTL_SECONDS,
  ): Promise<{ downloadUrl: string; expiresAt: string }> {
    const row = await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const found = await tx.documents.findFirst({
        where: { id, deleted_at: null },
        select: { id: true, object_key: true, file_name: true },
      });
      if (!found) throw new DomainError('DOCUMENTS.NOT_FOUND', { documentId: id });
      await audit(this.auditService, tx, {
        action: 'EXPORT',
        operation: AUDIT_OPERATIONS.DOCUMENT_DOWNLOAD_URL_ISSUED,
        entityType: 'documents',
        entityId: id,
        newState: toJsonState({ ttlSeconds }),
      });
      return found;
    });

    return this.storage.createDownloadUrl({
      objectKey: row.object_key,
      fileName: row.file_name,
      ttlSeconds,
    });
  }

  /**
   * Suppression LOGIQUE : la fiche est marquée, l'objet reste en place.
   * `DocumentPurgeService` le détruira après le délai de rétractation.
   */
  async softDelete(organizationId: string, userId: string, id: string): Promise<void> {
    await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = (await tx.documents.findFirst({
        where: { id, deleted_at: null },
      })) as unknown as DocumentRow | null;
      if (!before) throw new DomainError('DOCUMENTS.NOT_FOUND', { documentId: id });

      await tx.documents.update({
        where: { id },
        data: { deleted_at: new Date(), updated_at: new Date() },
      });
      await audit(this.auditService, tx, {
        action: 'DELETE',
        operation: AUDIT_OPERATIONS.DOCUMENT_DELETED,
        entityType: 'documents',
        entityId: id,
        previousState: toJsonState(toDocumentView(before)),
      });
    });
  }
}

/** `org/{org}/{kind}/{uuid}.ext` → `{uuid}`, ou `null` si la forme diffère. */
export function documentIdFromKey(objectKey: string): string | null {
  const base = objectKey.split('/').pop() ?? '';
  const withoutExtension = base.replace(/\.[a-z0-9]+$/i, '');
  return /^[0-9a-f-]{36}$/i.test(withoutExtension) ? withoutExtension : null;
}
