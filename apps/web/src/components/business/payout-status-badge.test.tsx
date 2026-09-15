import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PayoutStatusBadge } from '@/components/business/payout-status-badge';
import { PAYOUT_STATUS_LABELS } from '@/lib/enum-labels';
import type { PayoutStatus } from '@/lib/api/types';

describe('PayoutStatusBadge', () => {
  const statuses: PayoutStatus[] = [
    'PENDING',
    'APPROVED',
    'PROCESSING',
    'PAID',
    'FAILED',
    'CANCELLED',
  ];

  it.each(statuses)('affiche le libellé fr-CG pour le statut %s', (status) => {
    render(<PayoutStatusBadge status={status} />);
    expect(screen.getByText(PAYOUT_STATUS_LABELS[status])).toBeInTheDocument();
  });
});
