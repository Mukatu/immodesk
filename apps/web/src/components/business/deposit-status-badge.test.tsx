import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DepositStatusBadge } from '@/components/business/deposit-status-badge';
import { DEPOSIT_STATUS_LABELS } from '@/lib/enum-labels';
import type { DepositStatus } from '@/lib/api/types';

describe('DepositStatusBadge', () => {
  const statuses: DepositStatus[] = [
    'PENDING',
    'PARTIALLY_PAID',
    'HELD',
    'PARTIALLY_REFUNDED',
    'REFUNDED',
    'FORFEITED',
  ];

  it.each(statuses)('affiche le libellé fr-CG pour le statut %s', (status) => {
    render(<DepositStatusBadge status={status} />);
    expect(screen.getByText(DEPOSIT_STATUS_LABELS[status])).toBeInTheDocument();
  });
});
