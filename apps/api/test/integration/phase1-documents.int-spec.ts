import { createHash } from 'node:crypto';
import { DocumentPurgeService } from '../../src/modules/documents/application/document-purge.service';
import { S3ObjectStorage } from '../../src/modules/documents/infrastructure/s3-object-storage';
import {
  api,
  cleanupUser,
  login,
  startTestApp,
  stopTestApp,
  uniquePhone,
  type TestContext,
} from './helpers';

/** PNG 1x1 valide : assez pour éprouver un vrai aller-retour S3. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('Phase 1 — documents : URL signées contre MinIO réel', () => {
  let ctx: TestContext;
  const ownerPhone = uniquePhone();
  const strangerPhone = uniquePhone();

  let owner: { accessToken: string; userId: string };
  let stranger: { accessToken: string; userId: string };
  let organizationId: string;
  let otherOrganizationId: string;
  let tenantId: string;
  let documentId: string;
  let objectKey: string;

  beforeAll(async () => {
    ctx = await startTestApp();
    owner = await login(ctx, ownerPhone);

    const organization = await api(ctx, 'POST', '/organizations', {
      accessToken: owner.accessToken,
      body: {
        type: 'AGENCY',
        legalName: 'Agence Documents Intégration SARL',
        city: 'Brazzaville',
        district: 'Ouenzé',
        contactPhone: ownerPhone,
      },
    });
    organizationId = organization.body.id;

    const tenant = await api(ctx, 'POST', '/tenants', {
      accessToken: owner.accessToken,
      organizationId,
      body: { lastName: 'Loemba', firstName: 'Bernadette', primaryPhone: uniquePhone() },
    });
    tenantId = tenant.body.id;

    stranger = await login(ctx, strangerPhone);
    const other = await api(ctx, 'POST', '/organizations', {
      accessToken: stranger.accessToken,
      body: {
        type: 'AGENCY',
        legalName: 'Agence B Documents SARL',
        city: 'Pointe-Noire',
        contactPhone: strangerPhone,
      },
    });
    otherOrganizationId = other.body.id;
  }, 60_000);

  afterAll(async () => {
    for (const phone of [ownerPhone, strangerPhone]) await cleanupUser(ctx, phone);
    await stopTestApp(ctx);
  });

  const asOwner = () => ({ accessToken: owner.accessToken, organizationId });

  it('refuse un type MIME hors liste et un fichier trop volumineux', async () => {
    const badMime = await api(ctx, 'POST', '/documents/upload-url', {
      ...asOwner(),
      body: {
        fileName: 'virus.exe',
        mimeType: 'application/x-msdownload',
        sizeBytes: 1000,
        kind: 'OTHER',
      },
    });
    // 415 côté contrat ; la validation de DTO l'attrape en amont (422) si le
    // type n'est même pas dans l'énumération exposée.
    expect([415, 422]).toContain(badMime.status);

    const tooLarge = await api(ctx, 'POST', '/documents/upload-url', {
      ...asOwner(),
      body: {
        fileName: 'scan.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 20 * 1024 * 1024,
        kind: 'ID_DOCUMENT',
      },
    });
    expect(tooLarge.status).toBe(413);
    expect(tooLarge.body.code).toBe('DOCUMENTS.FILE_TOO_LARGE');
  });

  it('signe une URL d’envoi, téléverse réellement, puis enregistre le document', async () => {
    const signed = await api(ctx, 'POST', '/documents/upload-url', {
      ...asOwner(),
      body: {
        fileName: 'cni-bernadette.png',
        mimeType: 'image/png',
        sizeBytes: PNG_1X1.length,
        kind: 'ID_DOCUMENT',
        relatedEntityType: 'tenant',
        relatedEntityId: tenantId,
      },
    });

    expect(signed.status).toBe(201);
    expect(signed.body.uploadUrl).toContain('X-Amz-Signature');
    // La clé est décidée par l'API et préfixée par l'organisation.
    expect(signed.body.objectKey.startsWith(`org/${organizationId}/id_document/`)).toBe(true);
    expect(signed.body.maxSizeBytes).toBe(15 * 1024 * 1024);
    objectKey = signed.body.objectKey;

    // Téléversement réel vers MinIO, avec le Content-Type signé.
    const put = await fetch(signed.body.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: PNG_1X1,
    });
    expect(put.status).toBe(200);

    const registered = await api(ctx, 'POST', '/documents', {
      ...asOwner(),
      body: {
        objectKey,
        fileName: 'cni-bernadette.png',
        mimeType: 'image/png',
        sizeBytes: PNG_1X1.length,
        kind: 'ID_DOCUMENT',
        relatedEntityType: 'tenant',
        relatedEntityId: tenantId,
        checksumSha256: createHash('sha256').update(PNG_1X1).digest('hex'),
      },
    });

    expect(registered.status).toBe(201);
    expect(registered.body.sizeBytes).toBe(PNG_1X1.length);
    expect(registered.body.relatedEntityId).toBe(tenantId);
    documentId = registered.body.id;

    // La fiche apparaît dans le détail du locataire.
    const detail = await api(ctx, 'GET', `/tenants/${tenantId}`, asOwner());
    expect(detail.body.documents).toHaveLength(1);
  });

  it('refuse d’enregistrer un document dont l’objet n’a jamais été téléversé', async () => {
    const missing = await api(ctx, 'POST', '/documents', {
      ...asOwner(),
      body: {
        objectKey: `org/${organizationId}/other/018f5b3c-dead-7000-8000-00000000dead.png`,
        fileName: 'fantome.png',
        mimeType: 'image/png',
        sizeBytes: 10,
        kind: 'OTHER',
      },
    });
    expect(missing.status).toBe(409);
    expect(missing.body.code).toBe('DOCUMENTS.OBJECT_MISSING');
  });

  it('refuse une clé d’objet appartenant à une autre organisation', async () => {
    const foreign = await api(ctx, 'POST', '/documents', {
      ...asOwner(),
      body: {
        objectKey: `org/${otherOrganizationId}/other/018f5b3c-0000-7000-8000-000000000001.png`,
        fileName: 'vol.png',
        mimeType: 'image/png',
        sizeBytes: 10,
        kind: 'OTHER',
      },
    });
    expect(foreign.status).toBe(422);
    expect(foreign.body.code).toBe('DOCUMENTS.OBJECT_KEY_INVALID');
  });

  it('délivre une URL signée de téléchargement qui sert réellement le fichier', async () => {
    const link = await api(ctx, 'GET', `/documents/${documentId}/download-url`, asOwner());
    expect(link.status).toBe(200);
    expect(new Date(link.body.expiresAt).getTime()).toBeGreaterThan(Date.now());

    const downloaded = await fetch(link.body.downloadUrl);
    expect(downloaded.status).toBe(200);
    const bytes = Buffer.from(await downloaded.arrayBuffer());
    expect(bytes.equals(PNG_1X1)).toBe(true);
  });

  it('répond 404 à l’organisation B qui demande le lien, jamais 403', async () => {
    const hidden = await api(ctx, 'GET', `/documents/${documentId}/download-url`, {
      accessToken: stranger.accessToken,
      organizationId: otherOrganizationId,
    });
    expect(hidden.status).toBe(404);
    expect(hidden.body.code).toBe('DOCUMENTS.NOT_FOUND');
  });

  it('rend une URL signée réellement expirée après son délai', async () => {
    // URL signée pour 1 seconde : on éprouve l'expiration côté STOCKAGE,
    // pas une vérification applicative — c'est le stockage qui doit refuser.
    const storage = ctx.app.get(S3ObjectStorage);
    const shortLived = await storage.createDownloadUrl({ objectKey, ttlSeconds: 1 });

    const immediate = await fetch(shortLived.downloadUrl);
    expect(immediate.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 2500));

    const expired = await fetch(shortLived.downloadUrl);
    expect(expired.status).toBe(403);
    // Le refus vient bien du stockage (« Request has expired »), pas de l'API.
    const body = await expired.text();
    expect(body).toMatch(/expired/i);
    expect(body).toContain('AccessDenied');
  }, 30_000);

  it('supprime logiquement puis purge l’objet après le délai de rétractation', async () => {
    const removed = await api(ctx, 'DELETE', `/documents/${documentId}`, asOwner());
    expect(removed.status).toBe(204);

    const row = await ctx.admin.documents.findUnique({ where: { id: documentId } });
    expect(row?.deleted_at).not.toBeNull();
    // L'objet est toujours là : la purge est DIFFÉRÉE.
    const storage = ctx.app.get(S3ObjectStorage);
    expect(await storage.headObject(objectKey)).not.toBeNull();

    // Le document disparaît des lectures.
    const listed = await api(ctx, 'GET', `/documents?relatedEntityId=${tenantId}`, asOwner());
    expect(listed.body.items).toEqual([]);

    // On antidate la suppression pour franchir le délai de rétractation.
    await ctx.admin.$executeRawUnsafe(
      `UPDATE documents SET deleted_at = now() - interval '30 days' WHERE id = $1::uuid`,
      documentId,
    );

    const purge = ctx.app.get(DocumentPurgeService);
    const report = await purge.runOnce();
    expect(report.purged).toBeGreaterThanOrEqual(1);

    // L'objet a disparu du stockage, la ligne reste en pierre tombale : elle
    // est référencée en ON DELETE RESTRICT par d'autres tables.
    expect(await storage.headObject(objectKey)).toBeNull();
    const tombstone = await ctx.admin.documents.findUnique({ where: { id: documentId } });
    expect(tombstone).not.toBeNull();
    expect((tombstone?.metadata as Record<string, unknown>).purgedAt).toBeDefined();

    // Idempotence : un second passage ne retraite pas la même ligne.
    const second = await purge.runOnce();
    expect(second.scanned).toBe(0);
  }, 60_000);
});
