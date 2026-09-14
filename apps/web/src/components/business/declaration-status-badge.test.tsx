import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DeclarationStatusBadge } from '@/components/business/declaration-status-badge';
import { TRANSFER_DECLARATION_STATUS_LABELS } from '@/lib/enum-labels';
import type { DeclarationStatus } from '@/lib/api/types';

describe('DeclarationStatusBadge', () => {
  it('affiche le libellé fr-CG pour chaque statut', () => {
    (Object.keys(TRANSFER_DECLARATION_STATUS_LABELS) as DeclarationStatus[]).forEach((status) => {
      const { unmount } = render(<DeclarationStatusBadge status={status} />);
      expect(screen.getByText(TRANSFER_DECLARATION_STATUS_LABELS[status])).toBeInTheDocument();
      unmount();
    });
  });

  it('affiche un badge de succès pour MATCHED et APPROVED', () => {
    (['MATCHED', 'APPROVED'] as DeclarationStatus[]).forEach((status) => {
      const { unmount } = render(<DeclarationStatusBadge status={status} />);
      expect(screen.getByText(TRANSFER_DECLARATION_STATUS_LABELS[status]).className).toContain(
        'bg-success',
      );
      unmount();
    });
  });

  it('affiche un badge destructif pour REJECTED et CANCELLED', () => {
    (['REJECTED', 'CANCELLED'] as DeclarationStatus[]).forEach((status) => {
      const { unmount } = render(<DeclarationStatusBadge status={status} />);
      expect(screen.getByText(TRANSFER_DECLARATION_STATUS_LABELS[status]).className).toContain(
        'bg-destructive',
      );
      unmount();
    });
  });
});
