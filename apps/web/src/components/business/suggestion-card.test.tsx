import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SuggestionCard } from '@/components/business/suggestion-card';
import type { MatchSuggestion } from '@/lib/api/types';
import { formatXaf } from '@/lib/money';

function money(amount: number): string {
  return formatXaf(amount).replace(/\s+/g, ' ').trim();
}

function makeSuggestion(overrides: Partial<MatchSuggestion> = {}): MatchSuggestion {
  return {
    targetType: 'PAYMENT',
    targetId: 'pay-1',
    label: 'Virement loyer septembre',
    amount: 150000,
    date: '2026-09-05T00:00:00.000Z',
    confidenceScore: 92,
    criteria: { amountMatch: true, dateDelta: 1 },
    tenant: null,
    invoice: null,
    ...overrides,
  };
}

describe('SuggestionCard', () => {
  it('affiche la cible, le montant, la date et le score de confiance', () => {
    render(<SuggestionCard suggestion={makeSuggestion()} />);
    expect(screen.getByText('Virement loyer septembre')).toBeInTheDocument();
    expect(screen.getByText('Paiement')).toBeInTheDocument();
    expect(screen.getByText(money(150000))).toBeInTheDocument();
    expect(screen.getByText('05/09/2026')).toBeInTheDocument();
    expect(screen.getByText('92 %')).toBeInTheDocument();
  });

  it('affiche le locataire et le numéro de facture quand présents', () => {
    render(
      <SuggestionCard
        suggestion={makeSuggestion({
          tenant: { id: 't1', displayName: 'Jean Moussavou' },
          invoice: { id: 'inv-1', invoiceNumber: 'FAC-2026-042' },
        })}
      />,
    );
    expect(screen.getByText('Jean Moussavou')).toBeInTheDocument();
    expect(screen.getByText('FAC-2026-042')).toBeInTheDocument();
  });

  it("n'affiche pas les boutons d'action quand aucun callback n'est fourni", () => {
    render(<SuggestionCard suggestion={makeSuggestion()} />);
    expect(screen.queryByRole('button', { name: 'Valider' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rejeter' })).not.toBeInTheDocument();
  });

  it('appelle onConfirm et onReject lors des clics sur les boutons', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onReject = vi.fn();
    render(
      <SuggestionCard suggestion={makeSuggestion()} onConfirm={onConfirm} onReject={onReject} />,
    );

    await user.click(screen.getByRole('button', { name: 'Valider' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Rejeter' }));
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('désactive les boutons et affiche un libellé de chargement pendant la validation/le rejet', () => {
    render(
      <SuggestionCard
        suggestion={makeSuggestion()}
        onConfirm={() => {}}
        onReject={() => {}}
        isConfirming
      />,
    );
    expect(screen.getByRole('button', { name: 'Validation…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rejeter' })).toBeDisabled();
  });
});
