import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { MatchStatusBadge } from '@/components/business/match-status-badge';

describe('MatchStatusBadge', () => {
  it('affiche "Suggéré" pour un rapprochement proposé', () => {
    render(<MatchStatusBadge status="PROPOSED" />);
    expect(screen.getByText('Suggéré')).toBeInTheDocument();
  });

  it('affiche "Confirmé" pour un rapprochement confirmé', () => {
    render(<MatchStatusBadge status="CONFIRMED" />);
    expect(screen.getByText('Confirmé')).toBeInTheDocument();
  });

  it('affiche "Rejeté" pour un rapprochement rejeté', () => {
    render(<MatchStatusBadge status="REJECTED" />);
    expect(screen.getByText('Rejeté')).toBeInTheDocument();
  });

  it('affiche "Annulé" pour un rapprochement annulé', () => {
    render(<MatchStatusBadge status="REVERSED" />);
    expect(screen.getByText('Annulé')).toBeInTheDocument();
  });
});
