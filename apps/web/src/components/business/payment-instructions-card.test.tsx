import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PaymentInstructionsCard } from '@/components/business/payment-instructions-card';
import type { PaymentInstructions } from '@/lib/api/types';

function makeInstructions(overrides: Partial<PaymentInstructions> = {}): PaymentInstructions {
  return {
    transferReference: 'LOY-202609-001',
    invoice: null,
    bankAccounts: [],
    mobileMoneyNumbers: [],
    aggregatorAvailable: false,
    ...overrides,
  };
}

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
}

describe('PaymentInstructionsCard', () => {
  it('affiche la référence de virement et copie au clic sur "Copier"', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);

    render(<PaymentInstructionsCard instructions={makeInstructions()} />);

    expect(screen.getByText('LOY-202609-001')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Copier/ }));
    expect(writeText).toHaveBeenCalledWith('LOY-202609-001');
  });

  it('ignore silencieusement une erreur du presse-papiers', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('indisponible')));

    render(<PaymentInstructionsCard instructions={makeInstructions()} />);
    await userEvent.click(screen.getByRole('button', { name: /Copier/ }));

    expect(screen.getByRole('button', { name: /Copier/ })).toBeInTheDocument();
  });

  it("n'affiche pas la section comptes bancaires quand elle est vide", () => {
    render(<PaymentInstructionsCard instructions={makeInstructions()} />);
    expect(screen.queryByText('Comptes bancaires')).not.toBeInTheDocument();
  });

  it('affiche les comptes bancaires avec leurs informations', () => {
    render(
      <PaymentInstructionsCard
        instructions={makeInstructions({
          bankAccounts: [
            {
              id: 'acc-1',
              bankName: 'BGFIBank Congo',
              accountHolderName: 'Jean Dupont',
              accountNumber: '00123456789',
              ribKey: '42',
              iban: null,
            },
          ],
        })}
      />,
    );
    expect(screen.getByText('BGFIBank Congo')).toBeInTheDocument();
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
    expect(screen.getByText(/00123456789/)).toBeInTheDocument();
  });

  it('affiche les numéros Mobile Money avec un badge opérateur', () => {
    render(
      <PaymentInstructionsCard
        instructions={makeInstructions({
          mobileMoneyNumbers: [
            {
              bankAccountId: 'acc-2',
              provider: 'MTN_MOMO',
              msisdn: '+242066123456',
              holderName: 'Agence Immodesk',
            },
          ],
        })}
      />,
    );
    expect(screen.getByText('+242066123456')).toBeInTheDocument();
    expect(screen.getByText('MTN Mobile Money')).toBeInTheDocument();
  });

  it("n'affiche pas la section Mobile Money quand elle est vide", () => {
    render(<PaymentInstructionsCard instructions={makeInstructions()} />);
    expect(screen.queryByText('Numéros Mobile Money')).not.toBeInTheDocument();
  });
});
