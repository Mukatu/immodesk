import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { DocumentUploader, validateDocumentFile } from '@/components/business/document-uploader';

const {
  requestUploadUrlMock,
  createDocumentMock,
  deleteDocumentMock,
  fetchDocumentDownloadUrlMock,
} = vi.hoisted(() => ({
  requestUploadUrlMock: vi.fn(),
  createDocumentMock: vi.fn(),
  deleteDocumentMock: vi.fn(),
  fetchDocumentDownloadUrlMock: vi.fn(),
}));

vi.mock('@/lib/api/hooks/use-documents', () => ({
  useDocuments: vi.fn(() => ({ data: { items: [] }, isLoading: false })),
  useRequestUploadUrl: vi.fn(() => ({ mutateAsync: requestUploadUrlMock })),
  useCreateDocument: vi.fn(() => ({ mutateAsync: createDocumentMock })),
  useDeleteDocument: vi.fn(() => ({ mutate: deleteDocumentMock, isPending: false })),
  fetchDocumentDownloadUrl: fetchDocumentDownloadUrlMock,
}));

describe('validateDocumentFile', () => {
  it('rejette une image de 20 Mo (trop volumineuse)', () => {
    const message = validateDocumentFile({
      name: 'photo.jpg',
      type: 'image/jpeg',
      size: 20 * 1024 * 1024,
    });
    expect(message).toBe(
      'Fichier trop volumineux (maximum 15 Mo pour une image, 25 Mo pour un PDF).',
    );
  });

  it('rejette un fichier image/gif (format non pris en charge)', () => {
    const message = validateDocumentFile({ name: 'anim.gif', type: 'image/gif', size: 1024 });
    expect(message).toBe(
      'Format de fichier non pris en charge (jpeg, png, webp, heic ou pdf uniquement).',
    );
  });

  it('accepte un pdf de 10 Mo', () => {
    const message = validateDocumentFile({
      name: 'bail.pdf',
      type: 'application/pdf',
      size: 10 * 1024 * 1024,
    });
    expect(message).toBeNull();
  });

  it('accepte une image de 5 Mo', () => {
    const message = validateDocumentFile({
      name: 'photo.jpg',
      type: 'image/jpeg',
      size: 5 * 1024 * 1024,
    });
    expect(message).toBeNull();
  });

  it('rejette un pdf de 30 Mo (trop volumineux)', () => {
    const message = validateDocumentFile({
      name: 'gros.pdf',
      type: 'application/pdf',
      size: 30 * 1024 * 1024,
    });
    expect(message).toBe(
      'Fichier trop volumineux (maximum 15 Mo pour une image, 25 Mo pour un PDF).',
    );
  });
});

describe('DocumentUploader', () => {
  it("affiche une erreur pour un fichier invalide et n'envoie aucune mutation", () => {
    render(
      <DocumentUploader relatedEntityType="tenant" relatedEntityId="tenant-1" kind="ID_DOCUMENT" />,
    );

    const input = screen.getByLabelText(/glissez-déposez/i) as HTMLInputElement;
    const file = new File(['contenu'], 'anim.gif', { type: 'image/gif' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Format de fichier non pris en charge (jpeg, png, webp, heic ou pdf uniquement).',
    );
    expect(requestUploadUrlMock).not.toHaveBeenCalled();
    expect(createDocumentMock).not.toHaveBeenCalled();
  });
});
