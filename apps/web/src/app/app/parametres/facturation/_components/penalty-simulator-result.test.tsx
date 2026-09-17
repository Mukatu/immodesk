import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PenaltySimulatorResult } from './penalty-simulator-result';

describe('PenaltySimulatorResult', () => {
  it('affiche le montant, le plafond appliqué et le nombre de périodes', () => {
    render(
      <PenaltySimulatorResult
        result={{ penaltyAmount: 15_000, cappedBy: 'capAmount', periods: 3 }}
        amount="15 000 FCFA"
      />,
    );
    expect(screen.getByText('15 000 FCFA')).toBeInTheDocument();
    expect(screen.getByText('Plafond en montant')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it("indique l'absence de plafond quand cappedBy est nul", () => {
    render(
      <PenaltySimulatorResult
        result={{ penaltyAmount: 5_000, cappedBy: null, periods: 1 }}
        amount="5 000 FCFA"
      />,
    );
    expect(screen.getByText('Aucun plafond atteint')).toBeInTheDocument();
  });

  it('distingue le plafond en pourcentage du solde', () => {
    render(
      <PenaltySimulatorResult
        result={{ penaltyAmount: 8_000, cappedBy: 'capRateBps', periods: 2 }}
        amount="8 000 FCFA"
      />,
    );
    expect(screen.getByText('Plafond en pourcentage du solde')).toBeInTheDocument();
  });
});
