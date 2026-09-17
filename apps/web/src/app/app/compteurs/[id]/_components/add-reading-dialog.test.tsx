import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AddReadingDialog } from '@/app/app/compteurs/[id]/_components/add-reading-dialog';
import { ApiError } from '@/lib/api/errors';
import type { MeterReadingInput } from '@/lib/api/types';

vi.mock('@/lib/api/hooks/use-documents', () => ({
  useDocuments: vi.fn(() => ({ data: { items: [] }, isLoading: false })),
  useRequestUploadUrl: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useCreateDocument: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteDocument: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  fetchDocumentDownloadUrl: vi.fn(),
}));

function openDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Saisir un relevé' }));
}

function fillDateAndIndex(dateIso: string, index: string) {
  fireEvent.change(screen.getByLabelText('Date du relevé'), { target: { value: dateIso } });
  fireEvent.change(screen.getByLabelText('Index relevé'), { target: { value: index } });
}

describe('AddReadingDialog', () => {
  it('soumet le relevé sans jamais envoyer de consommation', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ id: 'reading-1' });
    render(
      <AddReadingDialog
        photoRelatedEntityType="unit"
        photoRelatedEntityId="unit-1"
        onSubmit={onSubmit}
      />,
    );
    openDialog();
    fillDateAndIndex('2026-02-01', '1500');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0]?.[0] as MeterReadingInput;
    expect(payload.readingDate).toBe('2026-02-01');
    expect(payload.currentIndex).toBe(1500);
    expect(payload).not.toHaveProperty('consumption');
  });

  it('affiche le message fr en cas de doublon de date (409)', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(409, {
        code: 'METERS.READING_DUPLICATE_DATE',
        message: 'Un relevé existe déjà à cette date pour ce compteur.',
      }),
    );
    render(
      <AddReadingDialog
        photoRelatedEntityType="unit"
        photoRelatedEntityId="unit-1"
        onSubmit={onSubmit}
      />,
    );
    openDialog();
    fillDateAndIndex('2026-02-01', '1500');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(
      await screen.findByText('Un relevé existe déjà à cette date pour ce compteur.'),
    ).toBeInTheDocument();
  });

  it('propose corriger/confirmer un passage par zéro en cas de régression (422)', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiError(422, {
          code: 'METERS.INDEX_REGRESSION',
          message: "L'index saisi est inférieur au précédent.",
        }),
      )
      .mockResolvedValueOnce({ id: 'reading-2' });
    render(
      <AddReadingDialog
        photoRelatedEntityType="unit"
        photoRelatedEntityId="unit-1"
        onSubmit={onSubmit}
      />,
    );
    openDialog();
    fillDateAndIndex('2026-02-01', '10');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    const rolloverButton = await screen.findByRole('button', {
      name: 'Confirmer le passage par zéro',
    });
    fireEvent.click(rolloverButton);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    const secondCall = onSubmit.mock.calls[1]?.[0] as MeterReadingInput;
    expect(secondCall.rolloverApplied).toBe(true);
    expect(secondCall.currentIndex).toBe(10);
  });

  it("revient au formulaire quand l'utilisateur choisit de corriger la saisie", async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(422, {
        code: 'METERS.INDEX_REGRESSION',
        message: "L'index saisi est inférieur au précédent.",
      }),
    );
    render(
      <AddReadingDialog
        photoRelatedEntityType="unit"
        photoRelatedEntityId="unit-1"
        onSubmit={onSubmit}
      />,
    );
    openDialog();
    fillDateAndIndex('2026-02-01', '10');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Corriger la saisie' }));
    expect(screen.getByLabelText('Index relevé')).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
