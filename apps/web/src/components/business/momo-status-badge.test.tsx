import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { MomoStatusBadge } from '@/components/business/momo-status-badge';
import { MOMO_STATUS_LABELS } from '@/lib/enum-labels';
import type { MomoStatus } from '@/lib/api/types';

describe('MomoStatusBadge', () => {
  it('affiche le libellé fr-CG pour chaque statut', () => {
    (Object.keys(MOMO_STATUS_LABELS) as MomoStatus[]).forEach((status) => {
      const { unmount } = render(<MomoStatusBadge status={status} />);
      expect(screen.getByText(MOMO_STATUS_LABELS[status])).toBeInTheDocument();
      unmount();
    });
  });

  it('affiche un badge de succès pour SUCCEEDED', () => {
    render(<MomoStatusBadge status="SUCCEEDED" />);
    expect(screen.getByText('Réussie').className).toContain('bg-success');
  });

  it('affiche un badge destructif pour FAILED, REJECTED et EXPIRED', () => {
    (['FAILED', 'REJECTED', 'EXPIRED'] as MomoStatus[]).forEach((status) => {
      const { unmount } = render(<MomoStatusBadge status={status} />);
      expect(screen.getByText(MOMO_STATUS_LABELS[status]).className).toContain('bg-destructive');
      unmount();
    });
  });

  it("affiche un badge d'avertissement pour PENDING, INITIATED et DECLARED", () => {
    (['PENDING', 'INITIATED', 'DECLARED'] as MomoStatus[]).forEach((status) => {
      const { unmount } = render(<MomoStatusBadge status={status} />);
      const el = screen.getByText(MOMO_STATUS_LABELS[status]);
      expect(el.className).toMatch(/bg-warning|border-border/);
      unmount();
    });
  });
});
