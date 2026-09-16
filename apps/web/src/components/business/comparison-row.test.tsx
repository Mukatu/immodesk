import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ComparisonRow } from '@/components/business/comparison-row';
import { formatXaf } from '@/lib/money';

describe('ComparisonRow', () => {
  it('sans écart : pas de retenue affichée, pas de classe de mise en évidence', () => {
    const { container } = render(
      <ComparisonRow label="Peinture salon" conditionIn="GOOD" conditionOut="GOOD" />,
    );

    expect(screen.queryByText(/Retenue proposée/)).not.toBeInTheDocument();

    const row = screen.getByRole('row');
    expect(row).not.toHaveClass('bg-destructive/10');
    expect(row).not.toHaveClass('bg-warning/10');
    expect(row).not.toHaveAttribute('aria-label');
    void container;
  });

  it('avec dégradation sans retenue : les deux badges sont affichés et le fond de dégradation est appliqué', () => {
    render(
      <ComparisonRow label="Robinetterie cuisine" conditionIn="GOOD" conditionOut="DAMAGED" />,
    );

    expect(screen.getByText('Bon état')).toBeInTheDocument();
    expect(screen.getByText('Dégradé')).toBeInTheDocument();
    expect(screen.queryByText(/Retenue proposée/)).not.toBeInTheDocument();

    const row = screen.getByRole('row');
    expect(row).toHaveClass('bg-destructive/10');
    expect(row).toHaveAttribute('aria-label', 'Dégradation détectée pour Robinetterie cuisine');
  });

  it('avec dégradation et retenue : le texte et le montant XAF formaté sont affichés', () => {
    const { container } = render(
      <ComparisonRow
        label="Sol chambre"
        conditionIn="GOOD"
        conditionOut="POOR"
        deductionAmount={25000}
      />,
    );

    expect(screen.getByText(/Retenue proposée/)).toBeInTheDocument();
    // formatXaf utilise une espace fine insécable (U+202F) que le normaliseur par
    // défaut de testing-library convertit en espace classique : on compare donc le
    // textContent brut plutôt que d'utiliser getByText avec la chaîne formatée.
    expect(container.textContent).toContain(formatXaf(25000));
  });

  it('affiche le libellé du poste', () => {
    render(
      <ComparisonRow label="Éclairage salle de bain" conditionIn="FAIR" conditionOut="FAIR" />,
    );

    expect(screen.getByText('Éclairage salle de bain')).toBeInTheDocument();
  });

  it("écart simple sans dégradation (amélioration) : applique le fond d'écart, pas celui de dégradation", () => {
    render(<ComparisonRow label="Serrure porte" conditionIn="POOR" conditionOut="GOOD" />);

    const row = screen.getByRole('row');
    expect(row).toHaveClass('bg-warning/10');
    expect(row).not.toHaveClass('bg-destructive/10');
    expect(row).toHaveAttribute('aria-label', 'Écart détecté pour Serrure porte');
  });
});
