import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { MessageStatusBadge } from '@/components/business/message-status-badge';
import type { MessageStatus } from '@/lib/api/types';
import { MESSAGE_STATUS_LABELS } from '@/lib/enum-labels';

const STATUSES: MessageStatus[] = [
  'QUEUED',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
  'REJECTED',
  'EXPIRED',
];

describe('MessageStatusBadge', () => {
  it.each(STATUSES)('affiche le libellé fr-CG pour le statut %s', (status) => {
    render(<MessageStatusBadge status={status} />);
    expect(screen.getByText(MESSAGE_STATUS_LABELS[status])).toBeInTheDocument();
  });
});
