import { documentIdFromKey } from '../../src/modules/documents/application/documents.service';
import {
  assertObjectKeyBelongsTo,
  assertUploadAllowed,
  buildObjectKey,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  sanitizeFileName,
  SIGNED_URL_TTL_SECONDS,
} from '../../src/modules/documents/domain/document-rules';
import { DomainError } from '../../src/shared/errors/domain-error';

describe('Règles de téléversement', () => {
  it('accepte les types du contrat et rend leur plafond', () => {
    expect(assertUploadAllowed('image/jpeg', 1_000_000)).toBe(MAX_IMAGE_BYTES);
    expect(assertUploadAllowed('image/png', 1_000_000)).toBe(MAX_IMAGE_BYTES);
    expect(assertUploadAllowed('image/webp', 1_000_000)).toBe(MAX_IMAGE_BYTES);
    expect(assertUploadAllowed('image/heic', 1_000_000)).toBe(MAX_IMAGE_BYTES);
    expect(assertUploadAllowed('application/pdf', 1_000_000)).toBe(MAX_PDF_BYTES);
  });

  it('tolère la casse et les espaces d’un en-tête recopié', () => {
    expect(assertUploadAllowed('  IMAGE/JPEG ', 10)).toBe(MAX_IMAGE_BYTES);
  });

  it('refuse un type hors liste avec 415', () => {
    expect.assertions(2);
    try {
      assertUploadAllowed('application/x-msdownload', 10);
    } catch (error) {
      expect((error as DomainError).code).toBe('DOCUMENTS.MIME_NOT_ALLOWED');
      expect((error as DomainError).status).toBe(415);
    }
  });

  it('refuse une image de plus de 15 Mo et un PDF de plus de 25 Mo avec 413', () => {
    expect(() => assertUploadAllowed('image/jpeg', MAX_IMAGE_BYTES)).not.toThrow();
    expect(() => assertUploadAllowed('image/jpeg', MAX_IMAGE_BYTES + 1)).toThrow(DomainError);
    expect(() => assertUploadAllowed('application/pdf', MAX_PDF_BYTES)).not.toThrow();

    try {
      assertUploadAllowed('application/pdf', MAX_PDF_BYTES + 1);
    } catch (error) {
      expect((error as DomainError).code).toBe('DOCUMENTS.FILE_TOO_LARGE');
      expect((error as DomainError).status).toBe(413);
    }
  });

  it('refuse une taille absurde', () => {
    expect(() => assertUploadAllowed('image/jpeg', -1)).toThrow(DomainError);
    expect(() => assertUploadAllowed('image/jpeg', Number.NaN)).toThrow(DomainError);
  });

  it('signe pour 10 minutes, valeur du contrat', () => {
    expect(SIGNED_URL_TTL_SECONDS).toBe(600);
  });
});

describe('Clés d’objet', () => {
  const organizationId = '018f5b3c-1111-7000-8000-000000000001';
  const documentId = '018f5b3c-2222-7000-8000-000000000002';

  it('préfixe par organisation et par nature de document', () => {
    const key = buildObjectKey({
      organizationId,
      documentId,
      kind: 'ID_DOCUMENT',
      mimeType: 'image/jpeg',
    });
    expect(key).toBe(`org/${organizationId}/id_document/${documentId}.jpg`);
  });

  it('choisit l’extension d’après le type MIME', () => {
    expect(
      buildObjectKey({
        organizationId,
        documentId,
        kind: 'LEASE_CONTRACT',
        mimeType: 'application/pdf',
      }),
    ).toMatch(/\.pdf$/);
  });

  it('retrouve l’identifiant du document dans sa clé', () => {
    const key = buildObjectKey({
      organizationId,
      documentId,
      kind: 'OTHER',
      mimeType: 'image/png',
    });
    expect(documentIdFromKey(key)).toBe(documentId);
    expect(documentIdFromKey('org/x/other/pas-un-uuid.png')).toBeNull();
  });

  it('refuse une clé qui sort du préfixe de l’organisation', () => {
    // Sans ce contrôle, un membre pourrait enregistrer une fiche pointant
    // vers l'objet d'un autre tenant.
    const foreign = '018f5b3c-9999-7000-8000-000000000009';
    expect(() =>
      assertObjectKeyBelongsTo(`org/${organizationId}/other/x.jpg`, organizationId),
    ).not.toThrow();

    expect(() => assertObjectKeyBelongsTo(`org/${foreign}/other/x.jpg`, organizationId)).toThrow(
      DomainError,
    );
    expect(() =>
      assertObjectKeyBelongsTo(`org/${organizationId}/../${foreign}/x.jpg`, organizationId),
    ).toThrow(DomainError);

    try {
      assertObjectKeyBelongsTo('n-importe-quoi', organizationId);
    } catch (error) {
      expect((error as DomainError).code).toBe('DOCUMENTS.OBJECT_KEY_INVALID');
    }
  });
});

describe('Assainissement du nom de fichier', () => {
  it('retire tout chemin', () => {
    expect(sanitizeFileName('C:\\Users\\jean\\cni.jpg')).toBe('cni.jpg');
    expect(sanitizeFileName('/tmp/photos/toit.png')).toBe('toit.png');
  });

  it('remplace les caractères dangereux pour un en-tête HTTP', () => {
    expect(sanitizeFileName('contrat"bail<2026>.pdf')).toBe('contrat_bail_2026_.pdf');
  });

  it('retombe sur un nom neutre si la saisie est vide', () => {
    expect(sanitizeFileName('')).toBe('document');
    expect(sanitizeFileName('   ')).toBe('document');
  });

  it('borne la longueur', () => {
    expect(sanitizeFileName('a'.repeat(400)).length).toBe(255);
  });
});
