import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTable } from '@/components/business/data-table';

interface Contact {
  id: string;
  name: string;
  email: string;
}

const rows: Contact[] = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
];

const columns: ColumnDef<Contact>[] = [
  {
    header: 'Nom',
    cell: ({ row }) => <a href={`/contacts/${row.original.id}`}>{row.original.name}</a>,
  },
  { header: 'Email', cell: ({ row }) => row.original.email },
  {
    id: 'actions',
    header: '',
    cell: () => <button type="button">Modifier</button>,
  },
];

/** Conteneur de la vue carte : seul wrapper portant la classe `sm:hidden`. */
function getCardWrapper(container: HTMLElement) {
  const wrapper = container.querySelector('.sm\\:hidden');
  if (!wrapper) throw new Error('Vue carte introuvable');
  return wrapper as HTMLElement;
}

/** Conteneur de la vue tableau : le wrapper portant `sm:block` (masqué par `hidden`). */
function getTableWrapper(container: HTMLElement) {
  const wrapper = container.querySelector('.sm\\:block');
  if (!wrapper) throw new Error('Vue tableau introuvable');
  return wrapper as HTMLElement;
}

describe('DataTable', () => {
  it('ne prend jamais la colonne de sélection comme titre de carte', () => {
    const withSelection: ColumnDef<Contact>[] = [
      {
        id: 'select',
        header: () => <input type="checkbox" aria-label="Tout sélectionner" />,
        cell: ({ row }) => (
          <input type="checkbox" aria-label={`Sélectionner ${row.original.name}`} />
        ),
      },
      ...columns,
    ];
    const { container } = render(<DataTable columns={withSelection} data={rows} />);
    const card = within(getCardWrapper(container));

    // La case à cocher reste rendue dans la carte…
    expect(card.getByLabelText('Sélectionner Alice')).toBeTruthy();
    // …mais c'est le nom, et non la case, qui sert de titre.
    expect(card.getByRole('link', { name: 'Alice' })).toBeTruthy();
    // Un titre ne porte pas d'étiquette : « Nom » n'apparaît donc pas dans la carte.
    expect(card.queryByText('Nom')).toBeNull();
  });

  it('rend les deux vues, la vue tableau masquée par classe sous 640px', () => {
    const { container } = render(<DataTable columns={columns} data={rows} />);

    const tableWrapper = getTableWrapper(container);
    expect(tableWrapper).toHaveClass('hidden', 'sm:block');
    expect(tableWrapper.querySelector('table')).toBeInTheDocument();

    const cardWrapper = getCardWrapper(container);
    expect(cardWrapper).toHaveClass('sm:hidden');
    expect(cardWrapper).not.toHaveClass('hidden');
  });

  it('affiche la première colonne comme titre de carte, sans étiquette', () => {
    const { container } = render(<DataTable columns={columns} data={rows} />);
    const cardWrapper = getCardWrapper(container);

    const link = within(cardWrapper).getByRole('link', { name: 'Alice' });
    expect(link).toBeInTheDocument();
    // Aucune étiquette « Nom » ne doit accompagner le titre dans la carte.
    expect(within(cardWrapper).queryByText('Nom')).not.toBeInTheDocument();
  });

  it("n'ajoute pas d'étiquette vide pour la colonne d'actions", () => {
    const { container } = render(<DataTable columns={columns} data={rows} />);
    const cardWrapper = getCardWrapper(container);
    const cards = cardWrapper.querySelectorAll(':scope > *');
    expect(cards.length).toBe(rows.length);

    const firstCard = cards[0] as HTMLElement;
    // Une seule étiquette par carte (Email) : le titre et le pied d'actions n'en ont pas.
    const labels = firstCard.querySelectorAll('.uppercase');
    expect(labels).toHaveLength(1);
    expect(labels[0]).toHaveTextContent('Email');
    expect(within(firstCard).getByRole('button', { name: 'Modifier' })).toBeInTheDocument();
  });

  it('donne son nom accessible via getRowLabel au bouton de la carte', () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={rows}
        onRowSelect={() => {}}
        getRowLabel={(row) => `Voir le détail de ${row.name}`}
      />,
    );
    const cardWrapper = getCardWrapper(container);
    expect(
      within(cardWrapper).getByRole('button', { name: 'Voir le détail de Alice' }),
    ).toBeInTheDocument();
    expect(
      within(cardWrapper).getByRole('button', { name: 'Voir le détail de Bob' }),
    ).toBeInTheDocument();
  });

  it('utilise le nom accessible générique quand getRowLabel est absent', () => {
    const { container } = render(
      <DataTable columns={columns} data={rows} onRowSelect={() => {}} />,
    );
    const cardWrapper = getCardWrapper(container);
    expect(
      within(cardWrapper).getAllByRole('button', { name: 'Voir le détail de cette ligne' }),
    ).toHaveLength(rows.length);
  });

  it('affiche des squelettes de chargement dans les deux vues', () => {
    const { container } = render(<DataTable columns={columns} data={[]} isLoading />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it("affiche l'état vide quand il n'y a aucune donnée", () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        emptyTitle="Aucun contact"
        emptyDescription="Ajoutez votre premier contact."
      />,
    );
    expect(screen.getByText('Aucun contact')).toBeInTheDocument();
    expect(screen.getByText('Ajoutez votre premier contact.')).toBeInTheDocument();
  });
});
