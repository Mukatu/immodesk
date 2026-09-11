import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { StatementTable } from '@/components/business/statement-table';
import type { TenantStatement } from '@/lib/api/types';

function makeStatement(): TenantStatement {
  return {
    openingBalance: 0,
    lines: [
      {
        date: '2026-09-01',
        type: 'INVOICE',
        reference: 'LOY-202609-00042',
        debit: 160000,
        credit: 0,
        balance: 160000,
      },
      {
        date: '2026-09-07',
        type: 'PAYMENT',
        reference: 'PAY-202609-00089',
        debit: 0,
        credit: 100000,
        balance: 60000,
      },
      {
        date: '2026-09-20',
        type: 'PAYMENT',
        reference: 'PAY-202609-00095',
        debit: 0,
        credit: 60000,
        balance: 0,
      },
    ],
    closingBalance: 0,
  };
}

describe('StatementTable', () => {
  it('affiche les lignes, le solde d’ouverture et de clôture', () => {
    render(<StatementTable statement={makeStatement()} />);
    expect(screen.getByText('LOY-202609-00042')).toBeInTheDocument();
    expect(screen.getByText('PAY-202609-00089')).toBeInTheDocument();
    expect(screen.getByText("Solde d'ouverture")).toBeInTheDocument();
    expect(screen.getByText('Solde de clôture')).toBeInTheDocument();
  });

  it('affiche un état vide quand il n’y a aucun mouvement', () => {
    render(<StatementTable statement={{ openingBalance: 0, lines: [], closingBalance: 0 }} />);
    expect(screen.getByText('Aucun mouvement')).toBeInTheDocument();
  });

  it('affiche le type en français pour chaque ligne', () => {
    render(<StatementTable statement={makeStatement()} />);
    expect(screen.getByText('Facture')).toBeInTheDocument();
    expect(screen.getAllByText('Paiement').length).toBe(2);
  });
});
