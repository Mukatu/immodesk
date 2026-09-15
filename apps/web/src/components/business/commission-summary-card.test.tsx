import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { CommissionSummaryCard } from '@/components/business/commission-summary-card';

describe('CommissionSummaryCard', () => {
  it('affiche les cumuls formatés en XAF', () => {
    const { container } = render(
      <CommissionSummaryCard
        title="Mandat MDT-2026-001"
        totals={{
          count: 3,
          baseAmount: 900_000,
          amount: 90_000,
          vatAmount: 16_200,
          totalAmount: 106_200,
        }}
      />,
    );
    expect(screen.getByText('Mandat MDT-2026-001')).toBeInTheDocument();
    const digitsOnly = (container.textContent ?? '').replace(/[^\d]/g, '');
    expect(digitsOnly).toContain('900000');
    expect(digitsOnly).toContain('90000');
    expect(digitsOnly).toContain('16200');
    expect(digitsOnly).toContain('106200');
    expect(screen.getByText('3 commissions')).toBeInTheDocument();
  });

  it('accorde « commission » au singulier pour un seul élément', () => {
    render(
      <CommissionSummaryCard
        title="Période 2026-08"
        totals={{
          count: 1,
          baseAmount: 300_000,
          amount: 30_000,
          vatAmount: 5_400,
          totalAmount: 35_400,
        }}
      />,
    );
    expect(screen.getByText('1 commission')).toBeInTheDocument();
  });
});
