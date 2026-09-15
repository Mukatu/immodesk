import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { CheckStatusBadge } from '@/components/business/check-status-badge';

describe('CheckStatusBadge', () => {
  it('affiche "Reçu" pour un chèque reçu', () => {
    render(<CheckStatusBadge status="RECEIVED" />);
    expect(screen.getByText('Reçu')).toBeInTheDocument();
  });

  it('affiche "Déposé" pour un chèque déposé', () => {
    render(<CheckStatusBadge status="DEPOSITED" />);
    expect(screen.getByText('Déposé')).toBeInTheDocument();
  });

  it('affiche "Compensé" pour un chèque compensé', () => {
    render(<CheckStatusBadge status="CLEARED" />);
    expect(screen.getByText('Compensé')).toBeInTheDocument();
  });

  it('affiche "Rejeté (impayé)" pour un chèque impayé', () => {
    render(<CheckStatusBadge status="BOUNCED" />);
    expect(screen.getByText('Rejeté (impayé)')).toBeInTheDocument();
  });

  it('affiche "Annulé" pour un chèque annulé', () => {
    render(<CheckStatusBadge status="CANCELLED" />);
    expect(screen.getByText('Annulé')).toBeInTheDocument();
  });

  it('affiche "Rendu au tireur" pour un chèque rendu', () => {
    render(<CheckStatusBadge status="RETURNED" />);
    expect(screen.getByText('Rendu au tireur')).toBeInTheDocument();
  });
});
