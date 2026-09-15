import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { StatementLinesTable } from '@/components/business/statement-lines-table';
import { formatXaf } from '@/lib/money';
import type { OwnerStatementLine } from '@/lib/api/types';

function line(overrides: Partial<OwnerStatementLine>): OwnerStatementLine {
  return {
    id: 'line-1',
    lineType: 'RENT_COLLECTED',
    label: 'Loyer',
    amount: 100_000,
    isDebit: false,
    position: 0,
    propertyId: null,
    unitId: null,
    leaseId: null,
    tenantId: null,
    invoiceId: null,
    paymentId: null,
    expenseId: null,
    commissionId: null,
    periodStart: null,
    periodEnd: null,
    ...overrides,
  };
}

describe('StatementLinesTable', () => {
  it("affiche un message vide quand il n'y a aucune ligne", () => {
    render(<StatementLinesTable lines={[]} />);
    expect(screen.getByText('Aucune ligne')).toBeInTheDocument();
  });

  it('place un crédit dans la colonne Crédit et un débit dans la colonne Débit', () => {
    render(
      <StatementLinesTable
        lines={[
          line({ id: 'l1', label: 'Loyer encaissé', amount: 100_000, isDebit: false, position: 0 }),
          line({
            id: 'l2',
            lineType: 'COMMISSION',
            label: 'Commission',
            amount: 10_000,
            isDebit: true,
            position: 1,
          }),
        ]}
      />,
    );
    const rows = screen.getAllByRole('row');
    const rentRow = rows[1];
    const commissionRow = rows[2];
    if (!rentRow || !commissionRow) throw new Error('Lignes attendues introuvables');
    // Ligne loyer (crédit) : débit à '—', crédit au montant.
    expect(rentRow.textContent).toContain('—');
    expect(rentRow.textContent).toContain(formatXaf(100_000));
    // Ligne commission (débit) : débit au montant, crédit à '—'.
    expect(commissionRow.textContent).toContain(formatXaf(10_000));
  });

  it('ne montre jamais de montant négatif : le signe vient uniquement de la colonne', () => {
    const { container } = render(
      <StatementLinesTable lines={[line({ amount: 10_000, isDebit: true })]} />,
    );
    expect(container.textContent).not.toMatch(/-\s*10/);
  });

  it('totalise le débit et le crédit', () => {
    render(
      <StatementLinesTable
        lines={[
          line({ id: 'l1', amount: 100_000, isDebit: false, position: 0 }),
          line({ id: 'l2', amount: 40_000, isDebit: true, position: 1 }),
        ]}
      />,
    );
    expect(screen.getByText(/Total débit/)).toBeInTheDocument();
    expect(screen.getByText(/Total crédit/)).toBeInTheDocument();
  });
});
