import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { UtilityRunReport } from './utility-run-report';

describe('UtilityRunReport', () => {
  it('affiche les trois parties du rapport séparément, sans lot ignoré ni erreur', () => {
    render(<UtilityRunReport created={12} skipped={[]} errors={[]} />);

    expect(screen.getByText('Lignes de charge créées')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Lots ignorés (0)')).toBeInTheDocument();
    expect(screen.getByText('Aucun lot ignoré.')).toBeInTheDocument();
    expect(screen.getByText('Erreurs (0)')).toBeInTheDocument();
    expect(screen.getByText('Aucune erreur.')).toBeInTheDocument();
  });

  it('accorde le texte au singulier pour une seule ligne créée', () => {
    render(<UtilityRunReport created={1} skipped={[]} errors={[]} />);
    expect(
      screen.getByText(/ligne WATER_CHARGE ou ELECTRICITY_CHARGE ajoutée/),
    ).toBeInTheDocument();
  });

  it('liste les lots ignorés avec leur motif', () => {
    render(
      <UtilityRunReport
        created={0}
        skipped={[
          {
            unitId: 'unit-1',
            propertyId: 'prop-1',
            reason: 'Aucun relevé exploitable sur la période.',
          },
          {
            unitId: '',
            propertyId: 'prop-2',
            reason: 'Compteur prépayé, aucune charge à relever.',
          },
        ]}
        errors={[]}
      />,
    );

    expect(screen.getByText('unit-1')).toBeInTheDocument();
    expect(screen.getByText('Aucun relevé exploitable sur la période.')).toBeInTheDocument();
    expect(screen.getByText('Lot non rattaché')).toBeInTheDocument();
    expect(screen.getByText('Compteur prépayé, aucune charge à relever.')).toBeInTheDocument();
  });

  it('liste les erreurs avec leur motif', () => {
    render(
      <UtilityRunReport
        created={3}
        skipped={[]}
        errors={[
          { meterId: 'meter-9', reason: 'Aucun bail actif pour ce lot.' },
          { unitId: 'unit-4', reason: 'Aucune facture ouverte pour ce bail.' },
        ]}
      />,
    );

    expect(screen.getByText('Compteur meter-9')).toBeInTheDocument();
    expect(screen.getByText('Aucun bail actif pour ce lot.')).toBeInTheDocument();
    expect(screen.getByText('unit-4')).toBeInTheDocument();
    expect(screen.getByText('Aucune facture ouverte pour ce bail.')).toBeInTheDocument();
  });
});
