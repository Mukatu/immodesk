import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { SyncBatchStatusBadge } from '@/components/business/sync-batch-status-badge';
import { SYNC_BATCH_STATUS_LABELS } from '@/lib/enum-labels';
import type { SyncBatchStatus } from '@/lib/api/types';

describe('SyncBatchStatusBadge', () => {
  it('affiche le libellé fr-CG pour chaque statut de lot', () => {
    (Object.keys(SYNC_BATCH_STATUS_LABELS) as SyncBatchStatus[]).forEach((status) => {
      const { unmount } = render(<SyncBatchStatusBadge status={status} />);
      expect(screen.getByText(SYNC_BATCH_STATUS_LABELS[status])).toBeInTheDocument();
      unmount();
    });
  });
});
