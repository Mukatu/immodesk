/**
 * Port de stockage objet.
 *
 * L'implémentation de la phase 1 est MinIO (compatible S3) ; Cloudflare R2 ou
 * un S3 réel se substitueront derrière la même interface sans toucher au
 * module. Aucune couche `application/` ne connaît `@aws-sdk/*`.
 */
export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

export interface PresignedUpload {
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
}

export interface StoredObjectInfo {
  sizeBytes: number;
  contentType: string | null;
  checksumSha256: string | null;
}

export interface ObjectStorage {
  /** Nom du bucket servi, tracé dans `documents.bucket`. */
  readonly bucket: string;

  /** Fournisseur, tracé dans `documents.storage_provider`. */
  readonly provider: 'S3' | 'R2' | 'LOCAL';

  /** URL signée d'envoi PUT, valable `ttlSeconds`. */
  createUploadUrl(input: {
    objectKey: string;
    mimeType: string;
    ttlSeconds: number;
  }): Promise<PresignedUpload>;

  /** URL signée de téléchargement GET, valable `ttlSeconds`. */
  createDownloadUrl(input: {
    objectKey: string;
    fileName?: string;
    ttlSeconds: number;
  }): Promise<{ downloadUrl: string; expiresAt: string }>;

  /**
   * Métadonnées de l'objet (HEAD), ou `null` s'il n'existe pas.
   * Sert à refuser l'enregistrement d'un document dont le fichier n'a jamais
   * été téléversé : sans cela, la base porterait des fiches fantômes.
   */
  headObject(objectKey: string): Promise<StoredObjectInfo | null>;

  /** Suppression définitive. Idempotente : supprimer l'absent ne lève pas. */
  deleteObject(objectKey: string): Promise<void>;

  /**
   * Dépose un objet produit PAR L'API elle-même (contrat PDF, quittance).
   *
   * Les pièces jointes du terrain ne passent jamais par l'API — elles partent
   * du téléphone vers le stockage par URL signée, et c'est ce qui économise
   * la bande passante d'une agence. Un document ENGENDRÉ côté serveur n'a pas
   * ce problème : il naît déjà dans le processus, et lui faire faire un
   * aller-retour par une URL signée n'ajouterait qu'une latence et un risque
   * d'échec supplémentaires.
   */
  putObject(input: {
    objectKey: string;
    mimeType: string;
    body: Buffer;
  }): Promise<{ sizeBytes: number }>;
}
