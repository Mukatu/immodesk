import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PaymentStatusBadge } from '@/components/business/payment-status-badge';
import { PAYMENT_STATUS_LABELS } from '@/lib/enum-labels';
import type { PaymentStatus } from '@/lib/api/types';

describe('PaymentStatusBadge', () => {
  const statuses: PaymentStatus[] = [
    'PENDING',
    'PENDING_VERIFICATION',
    'CONFIRMED',
    'REJECTED',
    'CANCELLED',
    'REVERSED',
  ];

  it.each(statuses)('affiche le libellé fr-CG pour le statut %s', (status) => {
    render(<PaymentStatusBadge status={status} />);
    expect(screen.getByText(PAYMENT_STATUS_LABELS[status])).toBeInTheDocument();
  });
});
