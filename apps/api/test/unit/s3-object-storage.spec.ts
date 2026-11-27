import { S3ObjectStorage } from '../../src/modules/documents/infrastructure/s3-object-storage';
import type { AppConfigService } from '../../src/shared/config/config.module';

/**
 * Forme des URL signées, vérifiée hors ligne (la signature SigV4 se calcule
 * sans joindre le stockage). L'aller-retour réel contre Garage est couvert par
 * test/integration/phase1-documents.int-spec.ts.
 */
function storage(overrides: Record<string, unknown> = {}): S3ObjectStorage {
  const values: Record<string, unknown> = {
    S3_ENDPOINT: 'http://immodesk-garage:3900',
    S3_PUBLIC_ENDPOINT: 'https://s3.staging.immodesk.watuneed.fr',
    S3_BUCKET: 'immodesk',
    S3_ACCESS_KEY: 'immodesk-api',
    S3_SECRET_KEY: 'secret-de-test-assez-long',
    S3_REGION: 'us-east-1',
    ...overrides,
  };
  const config = { get: (key: string) => values[key] } as unknown as AppConfigService;
  return new S3ObjectStorage(config);
}

describe('S3ObjectStorage — URL signées', () => {
  const objectKey = 'org/0190a1b2-0000-7000-8000-000000000001/id_document/x.png';

  it('signe le Content-Type de l’envoi, en plus de l’hôte', async () => {
    const s3 = storage();
    const { uploadUrl } = await s3.createUploadUrl({
      objectKey,
      mimeType: 'image/png',
      ttlSeconds: 600,
    });
    s3.onModuleDestroy();

    const url = new URL(uploadUrl);
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('content-type;host');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('600');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('n’ajoute aucune somme de contrôle (elle porterait sur un corps vide)', async () => {
    const s3 = storage();
    const { uploadUrl } = await s3.createUploadUrl({
      objectKey,
      mimeType: 'image/jpeg',
      ttlSeconds: 600,
    });
    s3.onModuleDestroy();

    const params = [...new URL(uploadUrl).searchParams.keys()].map((k) => k.toLowerCase());
    expect(params.filter((k) => k.includes('checksum'))).toEqual([]);
  });

  it('vise l’adresse publique, en adressage par chemin', async () => {
    const s3 = storage();
    const { uploadUrl } = await s3.createUploadUrl({
      objectKey,
      mimeType: 'image/png',
      ttlSeconds: 600,
    });
    const { downloadUrl } = await s3.createDownloadUrl({
      objectKey,
      fileName: 'cni.png',
      ttlSeconds: 600,
    });
    s3.onModuleDestroy();

    for (const signed of [uploadUrl, downloadUrl]) {
      const url = new URL(signed);
      expect(url.origin).toBe('https://s3.staging.immodesk.watuneed.fr');
      expect(url.pathname).toBe(`/immodesk/${objectKey}`);
    }
    // La lecture ne signe que l'hôte : un navigateur l'ouvre tel quel.
    expect(new URL(downloadUrl).searchParams.get('X-Amz-SignedHeaders')).toBe('host');
  });

  it('signe avec l’adresse interne quand aucune adresse publique n’est fournie', async () => {
    const s3 = storage({ S3_PUBLIC_ENDPOINT: undefined, S3_ENDPOINT: 'http://localhost:9010' });
    const { uploadUrl } = await s3.createUploadUrl({
      objectKey,
      mimeType: 'image/png',
      ttlSeconds: 60,
    });
    s3.onModuleDestroy();

    expect(new URL(uploadUrl).origin).toBe('http://localhost:9010');
  });
});
