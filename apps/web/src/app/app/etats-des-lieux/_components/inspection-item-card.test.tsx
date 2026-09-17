import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { InspectionItemCard } from './inspection-item-card';
import { formatXaf } from '@/lib/money';
import type { InspectionItem } from '@/lib/api/types';

/** Dates ancrées explicitement : aucune dépendance à la date du jour. */
const BASE_ITEM: InspectionItem = {
  id: 'item-1',
  inspectionId: 'insp-1',
  roomLabel: 'Salon',
  elementLabel: 'Peinture murale',
  elementCategory: 'PAINT',
  condition: 'DAMAGED',
  quantity: 1,
  isDamaged: true,
  damageDescription: "Trace d'humidité sur le mur nord",
  repairAmount: 45000,
  chargedTo: 'TENANT',
  position: 0,
  photos: [
    {
      id: 'photo-1',
      inspectionItemId: 'item-1',
      documentId: 'doc-1',
      caption: null,
      takenAt: '2026-01-10T08:00:00.000Z',
      checksumSha256: null,
      position: 0,
    },
  ],
  hasDepositDeduction: false,
  hasMaintenanceRequest: false,
};

describe('InspectionItemCard', () => {
  it("affiche l'élément, l'état constaté, la quantité, la dégradation, le montant et la partie qui en supporte le coût", () => {
    const { container } = render(<InspectionItemCard item={BASE_ITEM} />);

    expect(screen.getByText('Peinture murale')).toBeInTheDocument();
    expect(screen.getByText('Dégradé')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText("Trace d'humidité sur le mur nord")).toBeInTheDocument();
    // formatXaf utilise une espace fine insécable, normalisée par testing-library :
    // on compare le textContent brut plutôt que getByText avec la chaîne formatée.
    expect(container.textContent).toContain(formatXaf(45000));
    expect(container.textContent).toContain('à la charge : Locataire');
  });

  it('affiche une miniature par photo rattachée au poste', () => {
    render(<InspectionItemCard item={BASE_ITEM} />);

    expect(screen.getByRole('button', { name: /Voir la photo/ })).toBeInTheDocument();
  });

  it("affiche « Aucune photo » quand le poste n'a aucune photo rattachée", () => {
    render(<InspectionItemCard item={{ ...BASE_ITEM, photos: [] }} />);

    expect(screen.getByText('Aucune photo.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Voir la photo/ })).not.toBeInTheDocument();
  });

  it("n'affiche ni quantité ni dégradation ni montant quand le poste est en bon état", () => {
    const goodItem: InspectionItem = {
      ...BASE_ITEM,
      condition: 'GOOD',
      quantity: undefined,
      isDamaged: false,
      damageDescription: undefined,
      repairAmount: undefined,
      chargedTo: undefined,
      photos: [],
    };

    render(<InspectionItemCard item={goodItem} />);

    expect(screen.getByText('Bon état')).toBeInTheDocument();
    expect(screen.queryByText('Dégradation')).not.toBeInTheDocument();
    expect(screen.queryByText('Réparation estimée')).not.toBeInTheDocument();
  });

  it('affiche les actions fournies par le parent', () => {
    render(<InspectionItemCard item={BASE_ITEM} actions={<button type="button">Agir</button>} />);

    expect(screen.getByRole('button', { name: 'Agir' })).toBeInTheDocument();
  });
});
