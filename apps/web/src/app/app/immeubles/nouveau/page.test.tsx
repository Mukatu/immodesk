import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import NouvelImmeublePage from '@/app/app/immeubles/nouveau/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/lib/api/hooks/use-properties', () => ({
  useCreateProperty: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/lib/api/hooks/use-landlords', () => ({
  useLandlords: () => ({ data: { items: [] } }),
}));

describe('NouvelImmeublePage — meubles et équipements', () => {
  it("n'affiche pas la section des meubles tant que « Meublé » n'est pas coché", () => {
    render(<NouvelImmeublePage />);

    expect(screen.queryByText('Meubles et équipements fournis')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Lit' })).not.toBeInTheDocument();
  });

  it('affiche la section des meubles une fois « Meublé » coché', async () => {
    const user = userEvent.setup();
    render(<NouvelImmeublePage />);

    await user.click(screen.getByRole('checkbox', { name: 'Meublé' }));

    expect(screen.getByText('Meubles et équipements fournis')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Lit' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Canapé' })).toBeInTheDocument();
  });

  it('affiche le champ quantité seulement pour un meuble coché, avec un libellé explicite', async () => {
    const user = userEvent.setup();
    render(<NouvelImmeublePage />);

    await user.click(screen.getByRole('checkbox', { name: 'Meublé' }));
    expect(screen.queryByLabelText('Quantité — Lit')).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Lit' }));
    expect(screen.getByLabelText('Quantité — Lit')).toBeInTheDocument();
  });

  it('masque à nouveau la section et les meubles cochés quand on décoche « Meublé »', async () => {
    const user = userEvent.setup();
    render(<NouvelImmeublePage />);

    const furnishedCheckbox = screen.getByRole('checkbox', { name: 'Meublé' });
    await user.click(furnishedCheckbox);
    await user.click(screen.getByRole('checkbox', { name: 'Lit' }));
    await user.click(furnishedCheckbox);

    expect(screen.queryByText('Meubles et équipements fournis')).not.toBeInTheDocument();

    await user.click(furnishedCheckbox);
    expect(screen.getByRole('checkbox', { name: 'Lit' })).not.toBeChecked();
  });
});
