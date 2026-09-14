import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ApproveDeclarationDialog } from './approve-declaration-dialog';

/**
 * Le contrat (docs/api/phase4-contract.md, « Mobile Money déclaré » et
 * « Virement déclaré ») rend le motif obligatoire dès que le montant validé
 * diffère du montant déclaré — pour Mobile Money comme pour le virement,
 * qui partagent ce même composant.
 */
describe('ApproveDeclarationDialog', () => {
  async function openDialog() {
    await userEvent.click(screen.getByRole('button', { name: 'Valider' }));
  }

  it('montant inchangé sans motif : la validation est possible', async () => {
    const onApprove = vi.fn().mockResolvedValue(undefined);
    render(<ApproveDeclarationDialog declaredAmount={50000} onApprove={onApprove} />);
    await openDialog();

    const submitButton = screen.getByRole('button', { name: 'Confirmer la validation' });
    expect(submitButton).not.toBeDisabled();

    await userEvent.click(submitButton);

    await waitFor(() => expect(onApprove).toHaveBeenCalledTimes(1));
    expect(onApprove).toHaveBeenCalledWith({ approvedAmount: undefined, reason: undefined });
  });

  it('montant modifié sans motif : la validation est bloquée avec un message', async () => {
    const onApprove = vi.fn().mockResolvedValue(undefined);
    render(<ApproveDeclarationDialog declaredAmount={50000} onApprove={onApprove} />);
    await openDialog();

    const amountInput = screen.getByLabelText('Montant corrigé');
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '60000');

    expect(
      await screen.findByText(
        'Le motif est obligatoire lorsque le montant validé diffère du montant déclaré.',
      ),
    ).toBeInTheDocument();

    const submitButton = screen.getByRole('button', { name: 'Confirmer la validation' });
    expect(submitButton).toBeDisabled();

    await userEvent.click(submitButton);
    expect(onApprove).not.toHaveBeenCalled();
  });

  it('montant modifié avec motif renseigné : la validation redevient possible', async () => {
    const onApprove = vi.fn().mockResolvedValue(undefined);
    render(<ApproveDeclarationDialog declaredAmount={50000} onApprove={onApprove} />);
    await openDialog();

    const amountInput = screen.getByLabelText('Montant corrigé');
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '60000');

    const reasonInput = screen.getByLabelText(/Motif/);
    await userEvent.type(reasonInput, 'Écart justifié par le reçu joint.');

    const submitButton = screen.getByRole('button', { name: 'Confirmer la validation' });
    await waitFor(() => expect(submitButton).not.toBeDisabled());

    await userEvent.click(submitButton);

    await waitFor(() => expect(onApprove).toHaveBeenCalledTimes(1));
    expect(onApprove).toHaveBeenCalledWith({
      approvedAmount: 60000,
      reason: 'Écart justifié par le reçu joint.',
    });
  });
});
