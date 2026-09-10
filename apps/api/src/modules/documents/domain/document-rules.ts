import { DomainError } from '../../../shared/errors/domain-error';

/** Énumération `document_kind` du DDL. */
export const DOCUMENT_KINDS = [
  'ID_DOCUMENT',
  'LEASE_CONTRACT',
  'MANDATE',
  'RECEIPT_PDF',
  'INVOICE_PDF',
  'CASH_RECEIPT_PDF',
  'TRANSFER_PROOF',
  'CHECK_IMAGE',
  'BANK_STATEMENT',
  'INSPECTION_REPORT',
  'INSPECTION_PHOTO',
  'MAINTENANCE_PHOTO',
  'SIGNATURE',
  'OWNER_STATEMENT_PDF',
  'EXPENSE_INVOICE',
  'PROPERTY_PHOTO',
  'OTHER',
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

/** Entités auxquelles un document peut être rattaché (contrat phase 1). */
export const RELATED_ENTITY_TYPES = [
  'landlord',
  'tenant',
  'guarantor',
  'property',
  'unit',
  'organization',
] as const;
export type RelatedEntityType = (typeof RELATED_ENTITY_TYPES)[number];

const MEGABYTE = 1024 * 1024;

/**
 * Types acceptés et plafond de taille associé.
 *
 * 15 Mo pour une image, 25 Mo pour un PDF (contrat de phase 1) : une photo de
 * pièce d'identité prise au téléphone pèse 2 à 5 Mo, un contrat scanné de
 * 20 pages 10 à 15 Mo. Au-delà, c'est une erreur de manipulation, pas un
 * besoin — et la bande passante d'une agence de Brazzaville est comptée.
 */
export const ALLOWED_MIME_TYPES: Readonly<Record<string, number>> = {
  'image/jpeg': 15 * MEGABYTE,
  'image/png': 15 * MEGABYTE,
  'image/webp': 15 * MEGABYTE,
  'image/heic': 15 * MEGABYTE,
  'image/heif': 15 * MEGABYTE,
  'application/pdf': 25 * MEGABYTE,
};

export const MAX_IMAGE_BYTES = 15 * MEGABYTE;
export const MAX_PDF_BYTES = 25 * MEGABYTE;

/** Durée de validité des URL signées : 10 minutes (contrat de phase 1). */
export const SIGNED_URL_TTL_SECONDS = 600;

/** Extension de fichier reconnue pour un type MIME accepté. */
const EXTENSIONS: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
};

/**
 * Vérifie type MIME et taille AVANT de signer quoi que ce soit : refuser
 * après téléversement gaspillerait la bande passante du terrain.
 */
export function assertUploadAllowed(mimeType: string, sizeBytes: number): number {
  const normalized = (mimeType ?? '').trim().toLowerCase();
  const maxSizeBytes = ALLOWED_MIME_TYPES[normalized];
  if (maxSizeBytes === undefined) {
    throw new DomainError('DOCUMENTS.MIME_NOT_ALLOWED', {
      mimeType: normalized,
      allowed: Object.keys(ALLOWED_MIME_TYPES),
    });
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    throw new DomainError('DOCUMENTS.FILE_TOO_LARGE', { sizeBytes, maxSizeBytes });
  }
  if (sizeBytes > maxSizeBytes) {
    throw new DomainError('DOCUMENTS.FILE_TOO_LARGE', {
      sizeBytes,
      maxSizeBytes,
      mimeType: normalized,
    });
  }
  return maxSizeBytes;
}

/**
 * Clé d'objet : `org/{organizationId}/{kind}/{documentId}.{ext}`.
 *
 * Le préfixe par organisation cloisonne le stockage indépendamment de la base
 * — une politique de bucket peut s'y adosser — et rend toute fuite par
 * énumération de clés impossible sans connaître l'UUID de l'organisation.
 */
export function buildObjectKey(input: {
  organizationId: string;
  documentId: string;
  kind: DocumentKind;
  mimeType: string;
}): string {
  const extension = EXTENSIONS[input.mimeType.trim().toLowerCase()] ?? 'bin';
  return `org/${input.organizationId}/${input.kind.toLowerCase()}/${input.documentId}.${extension}`;
}

/**
 * Une clé fournie par le client à l'enregistrement doit appartenir au préfixe
 * de SON organisation : sans cela, un membre pourrait enregistrer une fiche
 * pointant vers l'objet d'un autre tenant.
 */
export function assertObjectKeyBelongsTo(objectKey: string, organizationId: string): void {
  const prefix = `org/${organizationId}/`;
  if (typeof objectKey !== 'string' || !objectKey.startsWith(prefix) || objectKey.includes('..')) {
    throw new DomainError('DOCUMENTS.OBJECT_KEY_INVALID', { objectKey });
  }
}

/**
 * Caracteres refuses dans un nom de fichier : controles C0 (U+0000 a U+001F)
 * et ceux qui ont un sens pour un systeme de fichiers ou un en-tete HTTP.
 * Construit par code : des caracteres de controle ecrits en clair dans une
 * source sont invisibles et se perdent au copier-coller.
 */
const UNSAFE_FILENAME_CHARS = new RegExp(
  `[${String.fromCharCode(0x00)}-${String.fromCharCode(0x1f)}<>:"|?*]`,
  'g',
);

/** Nom de fichier assaini : ni chemin, ni caractère de contrôle. */
export function sanitizeFileName(fileName: string): string {
  const base = (fileName ?? '').split(/[\\/]/).pop() ?? 'document';
  const cleaned = base.replace(UNSAFE_FILENAME_CHARS, '_').trim();
  return cleaned.length > 0 ? cleaned.slice(0, 255) : 'document';
}
