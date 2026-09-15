import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { MatchTypeBadge } from '@/components/business/match-type-badge';

describe('MatchTypeBadge', () => {
  it('affiche "Exact" pour un rapprochement exact', () => {
    render(<MatchTypeBadge matchType="EXACT" />);
    expect(screen.getByText('Exact')).toBeInTheDocument();
  });

  it('affiche "Suggéré" pour un rapprochement suggéré', () => {
    render(<MatchTypeBadge matchType="SUGGESTED" />);
    expect(screen.getByText('Suggéré')).toBeInTheDocument();
  });

  it('affiche "Manuel" pour un rapprochement manuel', () => {
    render(<MatchTypeBadge matchType="MANUAL" />);
    expect(screen.getByText('Manuel')).toBeInTheDocument();
  });

  it('affiche "Partiel" pour un rapprochement partiel', () => {
    render(<MatchTypeBadge matchType="PARTIAL" />);
    expect(screen.getByText('Partiel')).toBeInTheDocument();
  });

  it('affiche "Scindé" pour un rapprochement scindé', () => {
    render(<MatchTypeBadge matchType="SPLIT" />);
    expect(screen.getByText('Scindé')).toBeInTheDocument();
  });
});
