import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { InvoiceStatusBadge } from '@/components/business/invoice-status-badge';
import { INVOICE_STATUS_LABELS } from '@/lib/enum-labels';
import type { InvoiceStatus } from '@/lib/api/types';

const STATUSES: InvoiceStatus[] = [
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
];

describe('InvoiceStatusBadge', () => {
  it.each(STATUSES)('affiche le libellé fr-CG pour le statut %s', (status) => {
    render(<InvoiceStatusBadge status={status} />);
    expect(screen.getByText(INVOICE_STATUS_LABELS[status])).toBeInTheDocument();
  });

  it('ne rend jamais le code technique brut', () => {
    render(<InvoiceStatusBadge status="PARTIALLY_PAID" />);
    expect(screen.queryByText('PARTIALLY_PAID')).not.toBeInTheDocument();
  });
});
