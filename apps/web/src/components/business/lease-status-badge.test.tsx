import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { LeaseStatusBadge } from '@/components/business/lease-status-badge';
import { LEASE_STATUS_LABELS } from '@/lib/enum-labels';
import type { LeaseStatus } from '@/lib/api/types';

describe('LeaseStatusBadge', () => {
  const statuses: LeaseStatus[] = [
    'DRAFT',
    'PENDING_SIGNATURE',
    'ACTIVE',
    'NOTICE_GIVEN',
    'TERMINATED',
    'EXPIRED',
    'CANCELLED',
  ];

  it.each(statuses)('affiche le libellé fr-CG pour le statut %s', (status) => {
    render(<LeaseStatusBadge status={status} />);
    expect(screen.getByText(LEASE_STATUS_LABELS[status])).toBeInTheDocument();
  });
});
