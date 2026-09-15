import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { LineStateBadge } from '@/components/business/line-state-badge';

describe('LineStateBadge', () => {
  it('affiche "Rapprochée" pour une ligne rapprochée', () => {
    render(<LineStateBadge state="MATCHED" />);
    expect(screen.getByText('Rapprochée')).toBeInTheDocument();
  });

  it('affiche "Suggestion à valider" pour une ligne suggérée', () => {
    render(<LineStateBadge state="SUGGESTED" />);
    expect(screen.getByText('Suggestion à valider')).toBeInTheDocument();
  });

  it('affiche "Non rapprochée" pour une ligne non rapprochée', () => {
    render(<LineStateBadge state="UNMATCHED" />);
    expect(screen.getByText('Non rapprochée')).toBeInTheDocument();
  });

  it('affiche "Ignorée" pour une ligne ignorée', () => {
    render(<LineStateBadge state="IGNORED" />);
    expect(screen.getByText('Ignorée')).toBeInTheDocument();
  });

  it('affiche "Partiellement rapprochée" pour une ligne partiellement rapprochée', () => {
    render(<LineStateBadge state="PARTIALLY_MATCHED" />);
    expect(screen.getByText('Partiellement rapprochée')).toBeInTheDocument();
  });
});
