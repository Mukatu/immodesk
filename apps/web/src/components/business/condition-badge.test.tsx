import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ConditionBadge } from '@/components/business/condition-badge';

describe('ConditionBadge', () => {
  it('affiche "Neuf" pour NEW', () => {
    render(<ConditionBadge condition="NEW" />);
    expect(screen.getByText('Neuf')).toBeInTheDocument();
  });

  it('affiche "Bon état" pour GOOD', () => {
    render(<ConditionBadge condition="GOOD" />);
    expect(screen.getByText('Bon état')).toBeInTheDocument();
  });

  it('affiche "État d\'usage" pour FAIR', () => {
    render(<ConditionBadge condition="FAIR" />);
    expect(screen.getByText("État d'usage")).toBeInTheDocument();
  });

  it('affiche "Mauvais état" pour POOR', () => {
    render(<ConditionBadge condition="POOR" />);
    expect(screen.getByText('Mauvais état')).toBeInTheDocument();
  });

  it('affiche "Dégradé" pour DAMAGED', () => {
    render(<ConditionBadge condition="DAMAGED" />);
    expect(screen.getByText('Dégradé')).toBeInTheDocument();
  });

  it('affiche "Manquant" pour MISSING', () => {
    render(<ConditionBadge condition="MISSING" />);
    expect(screen.getByText('Manquant')).toBeInTheDocument();
  });
});
