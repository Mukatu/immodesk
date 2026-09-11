import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { CashHoldingGauge } from '@/components/business/cash-holding-gauge';

describe('CashHoldingGauge', () => {
  it('affiche le pourcentage sous le plafond sans alerte', () => {
    render(<CashHoldingGauge heldAmount={200000} capAmount={500000} />);
    expect(screen.getByText('40 % du plafond')).toBeInTheDocument();
    expect(screen.queryByText(/Plafond dépassé/)).not.toBeInTheDocument();
  });

  it('affiche 100 % à la limite du plafond sans alerte', () => {
    render(<CashHoldingGauge heldAmount={500000} capAmount={500000} />);
    expect(screen.getByText('100 % du plafond')).toBeInTheDocument();
    expect(screen.queryByText(/Plafond dépassé/)).not.toBeInTheDocument();
  });

  it('affiche une alerte textuelle explicite au-dessus du plafond', () => {
    render(<CashHoldingGauge heldAmount={620000} capAmount={500000} />);
    expect(screen.getByText(/Plafond dépassé \(124 %\)/)).toBeInTheDocument();
  });
});
