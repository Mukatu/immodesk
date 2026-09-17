import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { groupInspectionItemsByRoom, InspectionItemsByRoom } from './inspection-items-by-room';
import type { InspectionItem } from '@/lib/api/types';

function makeItem(overrides: Partial<InspectionItem> & Pick<InspectionItem, 'id' | 'roomLabel'>) {
  const item: InspectionItem = {
    inspectionId: 'insp-1',
    elementLabel: 'Élément',
    condition: 'GOOD',
    photos: [],
    position: 0,
    ...overrides,
  };
  return item;
}

/** Trois postes répartis sur deux pièces, dans un ordre volontairement non trié par pièce. */
const ITEMS: InspectionItem[] = [
  makeItem({ id: 'item-1', roomLabel: 'Salon', elementLabel: 'Peinture', position: 0 }),
  makeItem({ id: 'item-2', roomLabel: 'Cuisine', elementLabel: 'Évier', position: 1 }),
  makeItem({ id: 'item-3', roomLabel: 'Salon', elementLabel: 'Fenêtre', position: 2 }),
];

describe('groupInspectionItemsByRoom', () => {
  it('regroupe les postes par pièce en conservant leur ordre de première apparition', () => {
    const groups = groupInspectionItemsByRoom(ITEMS);

    expect(groups).toHaveLength(2);
    const [salon, cuisine] = groups;
    expect(salon?.roomLabel).toBe('Salon');
    expect(salon?.items.map((i) => i.id)).toEqual(['item-1', 'item-3']);
    expect(cuisine?.roomLabel).toBe('Cuisine');
    expect(cuisine?.items.map((i) => i.id)).toEqual(['item-2']);
  });

  it('renvoie un tableau vide pour une liste de postes vide', () => {
    expect(groupInspectionItemsByRoom([])).toEqual([]);
  });
});

describe('InspectionItemsByRoom', () => {
  it('affiche une section par pièce, chacune avec ses postes', () => {
    render(<InspectionItemsByRoom items={ITEMS} />);

    expect(screen.getByRole('heading', { name: 'Salon' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cuisine' })).toBeInTheDocument();
    expect(screen.getByText('Peinture')).toBeInTheDocument();
    expect(screen.getByText('Fenêtre')).toBeInTheDocument();
    expect(screen.getByText('Évier')).toBeInTheDocument();
  });

  it("affiche un état vide quand il n'y a aucun poste", () => {
    render(<InspectionItemsByRoom items={[]} />);

    expect(screen.getByText('Aucun poste')).toBeInTheDocument();
  });

  it('délègue le rendu des actions au parent, poste par poste', () => {
    render(
      <InspectionItemsByRoom
        items={ITEMS}
        renderActions={(item) => <button type="button">Agir sur {item.elementLabel}</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Agir sur Peinture' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agir sur Évier' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agir sur Fenêtre' })).toBeInTheDocument();
  });
});
