import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { SlaIndicator } from '@/components/business/sla-indicator';

const NOW = '2026-09-15T10:00:00.000Z';

describe('SlaIndicator', () => {
  it('affiche "Dépassé" quand l\'échéance est passée et la demande active', () => {
    render(<SlaIndicator status="OPEN" slaDueAt="2026-09-15T08:00:00.000Z" now={NOW} />);
    expect(screen.getByText('Dépassé')).toBeInTheDocument();
  });

  it('affiche "À risque" quand l\'échéance est dans moins de 24 h', () => {
    render(<SlaIndicator status="OPEN" slaDueAt="2026-09-15T12:00:00.000Z" now={NOW} />);
    expect(screen.getByText('À risque')).toBeInTheDocument();
  });

  it('affiche "Dans les délais" quand l\'échéance est dans 5 jours', () => {
    render(<SlaIndicator status="OPEN" slaDueAt="2026-09-20T10:00:00.000Z" now={NOW} />);
    expect(screen.getByText('Dans les délais')).toBeInTheDocument();
  });

  it('affiche "Clôturé" (et pas "Dépassé") pour une demande RESOLVED même en retard', () => {
    render(<SlaIndicator status="RESOLVED" slaDueAt="2026-09-15T08:00:00.000Z" now={NOW} />);
    expect(screen.getByText('Clôturé')).toBeInTheDocument();
    expect(screen.queryByText('Dépassé')).not.toBeInTheDocument();
  });

  it('affiche "Sans échéance" quand slaDueAt est null', () => {
    render(<SlaIndicator status="OPEN" slaDueAt={null} now={NOW} />);
    expect(screen.getByText('Sans échéance')).toBeInTheDocument();
  });
});
