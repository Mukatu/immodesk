import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import type { ObjectStorage, PresignedUpload, StoredObjectInfo } from '../domain/storage.port';

/**
 * Stockage objet compatible S3, branché sur Garage (développement, CI, recette).
 *
 * `forcePathStyle: true` : l'adressage par sous-domaine (`bucket.host`)
 * suppose un DNS générique que `localhost` n'a pas, et Garage n'a pas de
 * `root_domain`. La région (`S3_REGION`, `us-east-1`) entre dans la signature
 * SigV4 : elle doit égaler `s3_region` de garage.toml.
 *
 * Sommes de contrôle « WHEN_REQUIRED » : depuis 2025, le SDK ajoute par défaut
 * un CRC32 à chaque envoi. Dans une URL signée, il porterait le CRC32 d'un
 * corps VIDE (`x-amz-checksum-crc32=AAAAAA==`), et tout stockage qui le vérifie
 * (Garage 2.5) refuserait l'envoi réel du téléphone en 400.
 */
const CHECKSUMS = {
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
} as const;

/** En-têtes signés en plus de `host` dans les URL signées. */
export const SIGNED_UPLOAD_HEADERS: ReadonlySet<string> = new Set(['content-type']);
@Injectable()
export class S3ObjectStorage implements ObjectStorage, OnModuleDestroy {
  private readonly logger = new Logger(S3ObjectStorage.name);
  private readonly client: S3Client;
  /** Client de signature : adresse publique (S3_PUBLIC_ENDPOINT) vue par les mobiles. */
  private readonly signer: S3Client;
  readonly bucket: string;
  readonly provider = 'S3' as const;

  constructor(config: AppConfigService) {
    const endpoint = config.get('S3_ENDPOINT');
    const bucket = config.get('S3_BUCKET');
    const accessKeyId = config.get('S3_ACCESS_KEY');
    const secretAccessKey = config.get('S3_SECRET_KEY');

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      // Échec au démarrage plutôt qu'à la première pièce jointe téléversée
      // par un démarcheur en tournée.
      throw new Error(
        'Stockage objet non configuré : S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY et S3_SECRET_KEY sont requis.',
      );
    }

    this.bucket = bucket;
    this.client = new S3Client({
      endpoint,
      region: config.get('S3_REGION'),
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
      ...CHECKSUMS,
    });
    const publicEndpoint = config.get('S3_PUBLIC_ENDPOINT');
    this.signer = publicEndpoint
      ? new S3Client({
          endpoint: publicEndpoint,
          region: config.get('S3_REGION'),
          forcePathStyle: true,
          credentials: { accessKeyId, secretAccessKey },
          ...CHECKSUMS,
        })
      : this.client;
  }

  onModuleDestroy(): void {
    if (this.signer !== this.client) this.signer.destroy();
    this.client.destroy();
  }

  async createUploadUrl(input: {
    objectKey: string;
    mimeType: string;
    ttlSeconds: number;
  }): Promise<PresignedUpload> {
    // `Content-Type` est signé (SIGNED_UPLOAD_HEADERS) : le client DOIT envoyer
    // exactement le même en-tête, sinon le stockage répond 403. L'objet stocké
    // porte donc le type déclaré et vérifié par `assertUploadAllowed`.
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.objectKey,
      ContentType: input.mimeType,
    });
    const uploadUrl = await this.sign(command, input.ttlSeconds, SIGNED_UPLOAD_HEADERS);
    return {
      uploadUrl,
      objectKey: input.objectKey,
      expiresAt: expiryOf(input.ttlSeconds),
    };
  }

  async createDownloadUrl(input: {
    objectKey: string;
    fileName?: string;
    ttlSeconds: number;
  }): Promise<{ downloadUrl: string; expiresAt: string }> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: input.objectKey,
      ...(input.fileName
        ? { ResponseContentDisposition: `attachment; filename="${input.fileName}"` }
        : {}),
    });
    const downloadUrl = await this.sign(command, input.ttlSeconds);
    return { downloadUrl, expiresAt: expiryOf(input.ttlSeconds) };
  }

  async headObject(objectKey: string): Promise<StoredObjectInfo | null> {
    try {
      const response = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
      return {
        sizeBytes: Number(response.ContentLength ?? 0),
        contentType: response.ContentType ?? null,
        checksumSha256: response.ChecksumSHA256 ?? null,
      };
    } catch (error) {
      if (isNotFound(error)) return null;
      this.logger.error(`HEAD ${objectKey} en échec : ${(error as Error).message}`);
      throw new DomainError('DOCUMENTS.STORAGE_UNAVAILABLE', { objectKey });
    }
  }

  /** Relit intégralement le corps d'un objet (import de relevé bancaire). */
  async getObject(objectKey: string): Promise<Buffer> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
      const body = response.Body as AsyncIterable<Uint8Array> | undefined;
      if (!body) {
        throw new DomainError('DOCUMENTS.OBJECT_MISSING', { objectKey });
      }
      const chunks: Buffer[] = [];
      for await (const chunk of body) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch (error) {
      if (error instanceof DomainError) throw error;
      if (isNotFound(error)) {
        throw new DomainError('DOCUMENTS.OBJECT_MISSING', { objectKey });
      }
      this.logger.error(`GET ${objectKey} en échec : ${(error as Error).message}`);
      throw new DomainError('DOCUMENTS.STORAGE_UNAVAILABLE', { objectKey });
    }
  }

  async deleteObject(objectKey: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }));
    } catch (error) {
      if (isNotFound(error)) return;
      throw new DomainError('DOCUMENTS.STORAGE_UNAVAILABLE', { objectKey });
    }
  }

  /** Dépôt direct d'un objet engendré par l'API (contrat PDF, quittance). */
  async putObject(input: {
    objectKey: string;
    mimeType: string;
    body: Buffer;
  }): Promise<{ sizeBytes: number }> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: input.objectKey,
          ContentType: input.mimeType,
          Body: input.body,
          ContentLength: input.body.byteLength,
        }),
      );
      return { sizeBytes: input.body.byteLength };
    } catch (error) {
      this.logger.error(`PUT ${input.objectKey} en échec : ${(error as Error).message}`);
      throw new DomainError('DOCUMENTS.STORAGE_UNAVAILABLE', { objectKey: input.objectKey });
    }
  }

  private async sign(
    command: PutObjectCommand | GetObjectCommand,
    ttlSeconds: number,
    signableHeaders?: ReadonlySet<string>,
  ): Promise<string> {
    try {
      return await getSignedUrl(this.signer, command, {
        expiresIn: ttlSeconds,
        ...(signableHeaders ? { signableHeaders: new Set(signableHeaders) } : {}),
      });
    } catch (error) {
      this.logger.error(`Signature d'URL en échec : ${(error as Error).message}`);
      throw new DomainError('DOCUMENTS.STORAGE_UNAVAILABLE');
    }
  }
}

function expiryOf(ttlSeconds: number): string {
  return new Date(Date.now() + ttlSeconds * 1000).toISOString();
}

/** 404 / NoSuchKey / NotFound selon l'implémentation S3 rencontrée. */
function isNotFound(error: unknown): boolean {
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    candidate?.$metadata?.httpStatusCode === 404 ||
    candidate?.name === 'NotFound' ||
    candidate?.name === 'NoSuchKey'
  );
}
