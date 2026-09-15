import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ConfidenceScoreGauge } from '@/components/business/confidence-score-gauge';

describe('ConfidenceScoreGauge', () => {
  it('affiche "Confiance élevée" pour un score >= 90', () => {
    render(<ConfidenceScoreGauge score={95} />);
    expect(screen.getByText('95 %')).toBeInTheDocument();
    expect(screen.getByText('Confiance élevée')).toBeInTheDocument();
  });

  it('affiche "Confiance correcte" pour un score entre 75 et 89', () => {
    render(<ConfidenceScoreGauge score={80} />);
    expect(screen.getByText('80 %')).toBeInTheDocument();
    expect(screen.getByText('Confiance correcte')).toBeInTheDocument();
  });

  it('affiche "Confiance faible" pour un score < 75', () => {
    render(<ConfidenceScoreGauge score={40} />);
    expect(screen.getByText('40 %')).toBeInTheDocument();
    expect(screen.getByText('Confiance faible')).toBeInTheDocument();
  });

  it('affiche une barre de progression accessible avec la bonne valeur', () => {
    render(<ConfidenceScoreGauge score={62} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '62');
  });
});
