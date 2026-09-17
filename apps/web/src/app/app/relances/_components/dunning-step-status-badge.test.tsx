import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DunningStepStatusBadge } from './dunning-step-status-badge';
import type { DunningStepStatus } from '@/lib/api/types';

// Les six statuts exacts du contrat phase 9 : jamais DELIVERED (arbitrage 1).
const ALL_STATUSES: Array<[DunningStepStatus, string]> = [
  ['PENDING', 'En attente'],
  ['RUNNING', 'En cours'],
  ['SENT', 'Envoyée'],
  ['SKIPPED', 'Ignorée'],
  ['FAILED', 'Échec'],
  ['CANCELLED', 'Annulée'],
];

describe('DunningStepStatusBadge', () => {
  it.each(ALL_STATUSES)('affiche le libellé fr-CG pour %s', (status, label) => {
    render(<DunningStepStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("n'affiche jamais de statut DELIVERED", () => {
    render(<DunningStepStatusBadge status="SENT" />);
    expect(screen.queryByText(/remis/i)).not.toBeInTheDocument();
  });
});
