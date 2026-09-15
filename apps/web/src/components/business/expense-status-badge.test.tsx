import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ExpenseStatusBadge } from '@/components/business/expense-status-badge';
import { EXPENSE_STATUS_LABELS } from '@/lib/enum-labels';
import type { ExpenseStatus } from '@/lib/api/types';

describe('ExpenseStatusBadge', () => {
  const statuses: ExpenseStatus[] = [
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'PAID',
    'REBILLED',
    'REJECTED',
    'CANCELLED',
  ];

  it.each(statuses)('affiche le libellé fr-CG pour le statut %s', (status) => {
    render(<ExpenseStatusBadge status={status} />);
    expect(screen.getByText(EXPENSE_STATUS_LABELS[status])).toBeInTheDocument();
  });
});
