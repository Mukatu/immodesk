import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { OccupancyBadge } from '@/components/business/occupancy-badge';
import type { Occupancy } from '@/lib/api/types';

function makeOccupancy(occupancyRateBps: number): Occupancy {
  return {
    unitsCount: 10,
    occupiedCount: Math.round((occupancyRateBps / 10000) * 10),
    availableCount: 10 - Math.round((occupancyRateBps / 10000) * 10),
    occupancyRateBps,
  };
}

describe('OccupancyBadge', () => {
  it('affiche "90 % occupé" pour un taux élevé (>= 80 %)', () => {
    render(<OccupancyBadge occupancy={makeOccupancy(9000)} />);
    expect(screen.getByText('90 % occupé')).toBeInTheDocument();
  });

  it('affiche "50 % occupé" pour un taux intermédiaire (>= 40 % et < 80 %)', () => {
    render(<OccupancyBadge occupancy={makeOccupancy(5000)} />);
    expect(screen.getByText('50 % occupé')).toBeInTheDocument();
  });

  it('affiche "10 % occupé" pour un taux faible (< 40 %)', () => {
    render(<OccupancyBadge occupancy={makeOccupancy(1000)} />);
    expect(screen.getByText('10 % occupé')).toBeInTheDocument();
  });

  it('accepte directement un rateBps sans objet Occupancy', () => {
    render(<OccupancyBadge rateBps={9000} />);
    expect(screen.getByText('90 % occupé')).toBeInTheDocument();
  });

  it('affiche "—" quand il n\'y a aucun lot', () => {
    render(
      <OccupancyBadge
        occupancy={{ unitsCount: 0, occupiedCount: 0, availableCount: 0, occupancyRateBps: 0 }}
      />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
