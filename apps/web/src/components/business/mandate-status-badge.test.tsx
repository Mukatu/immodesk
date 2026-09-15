import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { MandateStatusBadge } from '@/components/business/mandate-status-badge';
import { MANDATE_STATUS_LABELS } from '@/lib/enum-labels';
import type { MandateStatus } from '@/lib/api/types';

describe('MandateStatusBadge', () => {
  const statuses: MandateStatus[] = ['DRAFT', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'EXPIRED'];

  it.each(statuses)('affiche le libellé fr-CG pour le statut %s', (status) => {
    render(<MandateStatusBadge status={status} />);
    expect(screen.getByText(MANDATE_STATUS_LABELS[status])).toBeInTheDocument();
  });
});
