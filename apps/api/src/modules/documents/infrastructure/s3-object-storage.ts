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
 * Stockage objet compatible S3, branché sur MinIO en local.
 *
 * `forcePathStyle: true` est indispensable avec MinIO : l'adressage par
 * sous-domaine (`bucket.host`) suppose un DNS générique que `localhost` n'a
 * pas. La région est fixée à `us-east-1` car le SDK en exige une pour signer,
 * alors que MinIO l'ignore.
 */
@Injectable()
export class S3ObjectStorage implements ObjectStorage, OnModuleDestroy {
  private readonly logger = new Logger(S3ObjectStorage.name);
  private readonly client: S3Client;
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
    });
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }

  async createUploadUrl(input: {
    objectKey: string;
    mimeType: string;
    ttlSeconds: number;
  }): Promise<PresignedUpload> {
    // `ContentType` est signé : le client DOIT envoyer le même en-tête,
    // ce qui empêche de faire passer un exécutable pour une image.
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.objectKey,
      ContentType: input.mimeType,
    });
    const uploadUrl = await this.sign(command, input.ttlSeconds);
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
  ): Promise<string> {
    try {
      return await getSignedUrl(this.client, command, { expiresIn: ttlSeconds });
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
