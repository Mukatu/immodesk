import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MomoWaitingPanel } from '@/components/business/momo-waiting-panel';

describe('MomoWaitingPanel', () => {
  it("affiche un compte à rebours mm:ss et le message d'attente pour PENDING", () => {
    render(<MomoWaitingPanel status="PENDING" secondsRemaining={125} />);
    expect(screen.getByText('02:05')).toBeInTheDocument();
    expect(screen.getByText(/En attente de la confirmation/)).toBeInTheDocument();
  });

  it('affiche aussi le compte à rebours pour INITIATED', () => {
    render(<MomoWaitingPanel status="INITIATED" secondsRemaining={5} />);
    expect(screen.getByText('00:05')).toBeInTheDocument();
  });

  it('porte un rôle "status" annoncé aux lecteurs d\'écran', () => {
    render(<MomoWaitingPanel status="PENDING" secondsRemaining={60} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('déclenche onCancel au clic sur "Annuler" pendant l\'attente', async () => {
    const onCancel = vi.fn();
    render(<MomoWaitingPanel status="PENDING" secondsRemaining={60} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("n'affiche pas de bouton Annuler quand onCancel n'est pas fourni", () => {
    render(<MomoWaitingPanel status="PENDING" secondsRemaining={60} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('affiche un message de succès pour SUCCEEDED', () => {
    render(<MomoWaitingPanel status="SUCCEEDED" secondsRemaining={0} />);
    expect(screen.getByText('Paiement confirmé avec succès.')).toBeInTheDocument();
  });

  it("affiche un message d'échec pour FAILED et REJECTED", () => {
    const { rerender } = render(<MomoWaitingPanel status="FAILED" secondsRemaining={0} />);
    expect(screen.getByText('Le paiement a échoué.')).toBeInTheDocument();

    rerender(<MomoWaitingPanel status="REJECTED" secondsRemaining={0} />);
    expect(screen.getByText('Le paiement a échoué.')).toBeInTheDocument();
  });

  it("affiche un message d'expiration proposant de réessayer pour EXPIRED", () => {
    render(<MomoWaitingPanel status="EXPIRED" secondsRemaining={0} />);
    expect(screen.getByText(/dépassé/)).toBeInTheDocument();
    expect(screen.getByText(/réessayer/)).toBeInTheDocument();
  });
});
