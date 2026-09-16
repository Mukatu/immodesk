import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { InspectionStatusBadge } from '@/components/business/inspection-status-badge';

describe('InspectionStatusBadge', () => {
  it('affiche "Brouillon" pour DRAFT', () => {
    render(<InspectionStatusBadge status="DRAFT" />);
    expect(screen.getByText('Brouillon')).toBeInTheDocument();
  });

  it('affiche "En cours" pour IN_PROGRESS', () => {
    render(<InspectionStatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText('En cours')).toBeInTheDocument();
  });

  it('affiche "En attente de signature" pour PENDING_SIGNATURE', () => {
    render(<InspectionStatusBadge status="PENDING_SIGNATURE" />);
    expect(screen.getByText('En attente de signature')).toBeInTheDocument();
  });

  it('affiche "Signé" pour SIGNED', () => {
    render(<InspectionStatusBadge status="SIGNED" />);
    expect(screen.getByText('Signé')).toBeInTheDocument();
  });

  it('affiche "Contesté" pour DISPUTED', () => {
    render(<InspectionStatusBadge status="DISPUTED" />);
    expect(screen.getByText('Contesté')).toBeInTheDocument();
  });

  it('affiche "Annulé" pour CANCELLED', () => {
    render(<InspectionStatusBadge status="CANCELLED" />);
    expect(screen.getByText('Annulé')).toBeInTheDocument();
  });
});
