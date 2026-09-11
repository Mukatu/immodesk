import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PartyList } from '@/components/business/party-list';
import type { LeaseParty } from '@/lib/api/types';

function makeParty(overrides: Partial<LeaseParty> = {}): LeaseParty {
  return {
    id: 'party-1',
    leaseId: 'lease-1',
    role: 'PRIMARY_TENANT',
    displayName: 'Serge Loubassou',
    signedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('PartyList', () => {
  it("affiche un etat vide quand il n'y a aucune partie", () => {
    render(<PartyList parties={[]} />);
    expect(screen.getByText('Aucune partie')).toBeInTheDocument();
  });

  it('affiche le role, la part, la solidarite et la signature pour chaque partie', () => {
    const parties: LeaseParty[] = [
      makeParty({
        id: 'party-1',
        role: 'PRIMARY_TENANT',
        displayName: 'Serge Loubassou',
        shareBps: 6000,
        isSolidary: true,
        signedAt: '2026-02-15T00:00:00.000Z',
      }),
      makeParty({
        id: 'party-2',
        role: 'CO_TENANT',
        displayName: 'Grace Ondongo',
        shareBps: 4000,
        signedAt: null,
      }),
    ];
    render(<PartyList parties={parties} />);

    expect(screen.getByText('Serge Loubassou')).toBeInTheDocument();
    expect(screen.getByText('Locataire principal')).toBeInTheDocument();
    expect(screen.getByText('60 %')).toBeInTheDocument();
    expect(screen.getByText('Solidaire')).toBeInTheDocument();
    expect(screen.getByText('Signé le 15/02/2026')).toBeInTheDocument();

    expect(screen.getByText('Grace Ondongo')).toBeInTheDocument();
    expect(screen.getByText('Colocataire')).toBeInTheDocument();
    expect(screen.getByText('40 %')).toBeInTheDocument();
    expect(screen.getByText('Non signé')).toBeInTheDocument();
  });
});
