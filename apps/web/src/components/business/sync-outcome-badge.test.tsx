import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { SyncOutcomeBadge } from '@/components/business/sync-outcome-badge';
import { SYNC_OPERATION_OUTCOME_LABELS } from '@/lib/enum-labels';
import type { SyncOperationOutcome } from '@/lib/api/types';

describe('SyncOutcomeBadge', () => {
  it("affiche le libellé fr-CG pour chaque issue d'opération", () => {
    (Object.keys(SYNC_OPERATION_OUTCOME_LABELS) as SyncOperationOutcome[]).forEach((outcome) => {
      const { unmount } = render(<SyncOutcomeBadge outcome={outcome} />);
      expect(screen.getByText(SYNC_OPERATION_OUTCOME_LABELS[outcome])).toBeInTheDocument();
      unmount();
    });
  });
});
