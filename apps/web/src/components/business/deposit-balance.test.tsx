import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DepositBalance } from '@/components/business/deposit-balance';
import { formatXaf } from '@/lib/money';

// Le séparateur de milliers de formatXaf est une espace insécable spéciale que le
// normaliseur par défaut de testing-library collapse en espace ASCII côté DOM mais
// pas côté texte recherché : on applique la même normalisation aux deux côtés.
function money(amount: number): string {
  return formatXaf(amount).replace(/\s+/g, ' ').trim();
}

describe('DepositBalance', () => {
  it("affiche les montants d'un dépôt PARTIALLY_PAID (encaissement partiel)", () => {
    render(
      <DepositBalance
        deposit={{
          requiredAmount: 150000,
          collectedAmount: 50000,
          deductedAmount: 0,
          refundedAmount: 0,
          heldAmount: 50000,
        }}
      />,
    );

    expect(screen.getAllByText(money(150000)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(money(50000)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(money(0)).length).toBeGreaterThan(0);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe(
      `Dépôt : ${formatXaf(150000)} requis, ${formatXaf(50000)} encaissé, ${formatXaf(50000)} retenu, ${formatXaf(0)} restitué`,
    );
  });

  it("affiche les montants d'un dépôt HELD (intégralement encaissé et retenu)", () => {
    render(
      <DepositBalance
        deposit={{
          requiredAmount: 240000,
          collectedAmount: 240000,
          deductedAmount: 0,
          refundedAmount: 0,
          heldAmount: 240000,
        }}
      />,
    );

    expect(screen.getAllByText(money(240000)).length).toBeGreaterThan(0);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe(
      `Dépôt : ${formatXaf(240000)} requis, ${formatXaf(240000)} encaissé, ${formatXaf(240000)} retenu, ${formatXaf(0)} restitué`,
    );
  });
});
