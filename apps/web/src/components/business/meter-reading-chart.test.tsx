import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { MeterReadingChart } from '@/components/business/meter-reading-chart';
import { formatXaf } from '@/lib/money';
import type { ConsumptionPoint } from '@/lib/api/types';

// Le séparateur de milliers de formatXaf est une espace insécable spéciale que le
// normaliseur par défaut de testing-library collapse en espace ASCII côté DOM mais
// pas côté texte recherché : on applique la même normalisation aux deux côtés
// (même convention que deposit-balance.test.tsx).
function money(amount: number): string {
  return formatXaf(amount).replace(/\s+/g, ' ').trim();
}

function makePoints(): ConsumptionPoint[] {
  return [
    { readingDate: '2026-01-05T00:00:00.000Z', consumption: 12, computedAmount: 6000 },
    { readingDate: '2026-02-05T00:00:00.000Z', consumption: 18, computedAmount: 9000 },
    { readingDate: '2026-03-05T00:00:00.000Z', consumption: 9, computedAmount: 4500 },
  ];
}

describe('MeterReadingChart', () => {
  it('affiche un message neutre et aucun graphique quand la liste est vide', () => {
    render(<MeterReadingChart data={[]} />);
    expect(screen.getByText('Aucun relevé disponible.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('affiche le graphique et le tableau caché avec les 3 relevés', () => {
    render(<MeterReadingChart data={makePoints()} />);

    expect(screen.getByRole('img')).toBeInTheDocument();

    const rows = screen.getAllByRole('row');
    // 1 ligne d'en-tête + 3 lignes de données.
    expect(rows).toHaveLength(4);

    expect(screen.getByText('05/01/2026')).toBeInTheDocument();
    expect(screen.getByText('05/02/2026')).toBeInTheDocument();
    expect(screen.getByText('05/03/2026')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText(money(6000))).toBeInTheDocument();
    expect(screen.getByText(money(9000))).toBeInTheDocument();
    expect(screen.getByText(money(4500))).toBeInTheDocument();
  });

  it('utilise le titre personnalisé dans le <title> du SVG', () => {
    const { container } = render(
      <MeterReadingChart data={makePoints()} title="Consommation électrique" />,
    );

    const titleEl = container.querySelector('svg > title');
    expect(titleEl).not.toBeNull();
    expect(titleEl?.textContent).toBe('Consommation électrique');
  });
});
