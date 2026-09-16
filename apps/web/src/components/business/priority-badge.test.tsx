import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PriorityBadge } from '@/components/business/priority-badge';

describe('PriorityBadge', () => {
  it('affiche "Faible" pour la priorité LOW', () => {
    render(<PriorityBadge priority="LOW" />);
    expect(screen.getByText('Faible')).toBeInTheDocument();
  });

  it('affiche "Normale" pour la priorité NORMAL', () => {
    render(<PriorityBadge priority="NORMAL" />);
    expect(screen.getByText('Normale')).toBeInTheDocument();
  });

  it('affiche "Haute" pour la priorité HIGH', () => {
    render(<PriorityBadge priority="HIGH" />);
    expect(screen.getByText('Haute')).toBeInTheDocument();
  });

  it('affiche "Urgente" pour la priorité URGENT', () => {
    render(<PriorityBadge priority="URGENT" />);
    expect(screen.getByText('Urgente')).toBeInTheDocument();
  });

  it('applique un style gras distinctif au badge URGENT', () => {
    render(<PriorityBadge priority="URGENT" />);
    expect(screen.getByText('Urgente')).toHaveClass('font-bold');
  });

  it("n'applique pas le style gras aux autres priorités", () => {
    render(<PriorityBadge priority="NORMAL" />);
    expect(screen.getByText('Normale')).not.toHaveClass('font-bold');
  });
});
