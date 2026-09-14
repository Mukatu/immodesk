import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConflictResolutionDialog } from './conflict-resolution-dialog';

/**
 * Contrat `POST /v1/sync/conflicts/{id}/resolve` : deux décisions, APPLY
 * (facture facultative, imputation automatique par défaut) et DISCARD (motif
 * obligatoire). Le clientRef d'origine est toujours conservé côté API, quelle
 * que soit la décision.
 */
describe('ConflictResolutionDialog', () => {
  const invoiceOptions = [{ id: 'invoice-2', label: 'LOY-202609-00002 — Grace Ondongo' }];

  async function openDialog() {
    await userEvent.click(screen.getByRole('button', { name: 'Résoudre ce conflit' }));
  }

  it('applique par défaut sans changer de facture, avec imputation automatique', async () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    const onDiscard = vi.fn();
    render(
      <ConflictResolutionDialog
        originalInvoiceLabel="LOY-202609-00001 (annulée)"
        invoiceOptions={invoiceOptions}
        onApply={onApply}
        onDiscard={onDiscard}
      />,
    );
    await openDialog();

    await userEvent.click(screen.getByRole('button', { name: "Confirmer l'application" }));

    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    expect(onApply).toHaveBeenCalledWith({ invoiceId: undefined, autoAllocate: true });
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it("propose la facture d'origine par défaut et permet de la remplacer (sélecteur, couvert en e2e)", async () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    render(
      <ConflictResolutionDialog
        originalInvoiceLabel="LOY-202609-00001 (annulée)"
        invoiceOptions={invoiceOptions}
        onApply={onApply}
        onDiscard={vi.fn()}
      />,
    );
    await openDialog();

    expect(screen.getByText("Conserver la facture d'origine")).toBeInTheDocument();
    expect(screen.getByText(/Facture d'origine : LOY-202609-00001/)).toBeInTheDocument();
  });

  it("désactive l'imputation automatique quand la case est décochée", async () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    render(
      <ConflictResolutionDialog
        originalInvoiceLabel="LOY-202609-00001 (annulée)"
        invoiceOptions={invoiceOptions}
        onApply={onApply}
        onDiscard={vi.fn()}
      />,
    );
    await openDialog();

    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: "Confirmer l'application" }));

    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    expect(onApply).toHaveBeenCalledWith({ invoiceId: undefined, autoAllocate: false });
  });

  it("bloque l'abandon sans motif puis le confirme une fois renseigné", async () => {
    const onDiscard = vi.fn().mockResolvedValue(undefined);
    render(
      <ConflictResolutionDialog
        originalInvoiceLabel="LOY-202609-00001 (annulée)"
        invoiceOptions={invoiceOptions}
        onApply={vi.fn()}
        onDiscard={onDiscard}
      />,
    );
    await openDialog();

    await userEvent.click(screen.getByRole('radio', { name: /Abandonner/ }));
    const confirmButton = screen.getByRole('button', { name: "Confirmer l'abandon" });
    expect(confirmButton).toBeDisabled();

    await userEvent.type(
      screen.getByLabelText(/Motif/),
      'Encaissement déjà régularisé au comptoir.',
    );
    await waitFor(() => expect(confirmButton).not.toBeDisabled());
    await userEvent.click(confirmButton);

    await waitFor(() => expect(onDiscard).toHaveBeenCalledTimes(1));
    expect(onDiscard).toHaveBeenCalledWith({
      reason: 'Encaissement déjà régularisé au comptoir.',
    });
  });
});
