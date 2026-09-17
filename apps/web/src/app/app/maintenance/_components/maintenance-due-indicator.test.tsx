import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { MaintenanceDueIndicator } from './maintenance-due-indicator';

// Dates ancrées explicitement : jamais `new Date()` / `Date.now()` dans ce
// fichier, pour rester insensible à la date du jour d'exécution des tests.
const REFERENCE_NOW = new Date('2026-03-15T10:00:00.000Z');
const PAST_DUE_DATE = '2026-03-10T10:00:00.000Z';
const FUTURE_DUE_DATE = '2026-03-20T10:00:00.000Z';

describe('MaintenanceDueIndicator', () => {
  it('signale le retard quand l’échéance est dépassée et la demande ouverte', () => {
    render(<MaintenanceDueIndicator slaDueAt={PAST_DUE_DATE} status="OPEN" now={REFERENCE_NOW} />);
    expect(screen.getByText(/en retard/i)).toBeInTheDocument();
  });

  it('ne signale pas de retard quand l’échéance n’est pas dépassée', () => {
    render(
      <MaintenanceDueIndicator slaDueAt={FUTURE_DUE_DATE} status="ASSIGNED" now={REFERENCE_NOW} />,
    );
    expect(screen.queryByText(/en retard/i)).not.toBeInTheDocument();
  });

  it.each(['RESOLVED', 'CLOSED', 'REJECTED'] as const)(
    'ne signale jamais de retard pour une demande %s même échéance dépassée',
    (status) => {
      render(
        <MaintenanceDueIndicator slaDueAt={PAST_DUE_DATE} status={status} now={REFERENCE_NOW} />,
      );
      expect(screen.queryByText(/en retard/i)).not.toBeInTheDocument();
    },
  );

  it('affiche un tiret quand aucune échéance n’est fixée', () => {
    render(<MaintenanceDueIndicator slaDueAt={null} status="OPEN" now={REFERENCE_NOW} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
