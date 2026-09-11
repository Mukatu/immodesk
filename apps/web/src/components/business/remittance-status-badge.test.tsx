import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { RemittanceStatusBadge } from '@/components/business/remittance-status-badge';
import { REMITTANCE_STATUS_LABELS } from '@/lib/enum-labels';
import type { RemittanceStatus } from '@/lib/api/types';

describe('RemittanceStatusBadge', () => {
  const statuses: RemittanceStatus[] = [
    'OPEN',
    'SUBMITTED',
    'VERIFIED',
    'DEPOSITED',
    'REJECTED',
    'CANCELLED',
  ];

  it.each(statuses)('affiche le libellé fr-CG pour le statut %s', (status) => {
    render(<RemittanceStatusBadge status={status} />);
    expect(screen.getByText(REMITTANCE_STATUS_LABELS[status])).toBeInTheDocument();
  });
});
