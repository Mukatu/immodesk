import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { StatementStatusBadge } from '@/components/business/statement-status-badge';
import { OWNER_STATEMENT_STATUS_LABELS } from '@/lib/enum-labels';
import type { OwnerStatementStatus } from '@/lib/api/types';

describe('StatementStatusBadge', () => {
  const statuses: OwnerStatementStatus[] = ['DRAFT', 'ISSUED', 'SENT', 'PAID', 'CANCELLED'];

  it.each(statuses)('affiche le libellé fr-CG pour le statut %s', (status) => {
    render(<StatementStatusBadge status={status} />);
    expect(screen.getByText(OWNER_STATEMENT_STATUS_LABELS[status])).toBeInTheDocument();
  });
});
