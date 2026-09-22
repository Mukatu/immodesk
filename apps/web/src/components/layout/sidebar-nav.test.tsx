import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SidebarNavList } from '@/components/layout/sidebar-nav';

const STORAGE_KEY = 'immodesk.sidebar-open-group';

let mockPathname = '/app';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

beforeEach(() => {
  mockPathname = '/app';
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe('SidebarNavList — groupes repliables (accordéon)', () => {
  it('tous les groupes libellés sont fermés par défaut', () => {
    render(<SidebarNavList isOwner={false} />);

    for (const label of ['Patrimoine', 'Finances', 'Gestion', 'Pilotage']) {
      expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-expanded', 'false');
    }
    expect(screen.queryByRole('link', { name: 'Bailleurs' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Factures' })).not.toBeInTheDocument();
  });

  it('ouvrir un groupe referme celui qui était ouvert', async () => {
    const user = userEvent.setup();
    render(<SidebarNavList isOwner={false} />);

    await user.click(screen.getByRole('button', { name: 'Patrimoine' }));
    const patrimoineButton = screen.getByRole('button', { name: 'Patrimoine' });
    expect(patrimoineButton).toHaveAttribute('aria-expanded', 'true');
    const patrimoinePanel = screen.getByRole('link', { name: 'Bailleurs' }).closest('div[id]');
    expect(patrimoinePanel).toHaveAttribute('id', patrimoineButton.getAttribute('aria-controls'));

    await user.click(screen.getByRole('button', { name: 'Finances' }));
    expect(screen.getByRole('button', { name: 'Finances' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Patrimoine' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('link', { name: 'Bailleurs' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Factures' })).toBeInTheDocument();
  });

  it('recliquer sur le groupe ouvert le referme', async () => {
    const user = userEvent.setup();
    render(<SidebarNavList isOwner={false} />);

    await user.click(screen.getByRole('button', { name: 'Gestion' }));
    expect(screen.getByRole('button', { name: 'Gestion' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Gestion' }));
    expect(screen.getByRole('button', { name: 'Gestion' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it("n'ouvre aucun groupe automatiquement, même sur une page qui en fait partie", () => {
    mockPathname = '/app/bailleurs';
    render(<SidebarNavList isOwner={false} />);

    expect(screen.getByRole('button', { name: 'Patrimoine' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('link', { name: 'Bailleurs' })).not.toBeInTheDocument();
  });

  it('mode réduit (icônes seules) : ni en-tête de groupe ni repli, tout est affiché', () => {
    render(<SidebarNavList isOwner={false} collapsed />);

    expect(screen.queryByRole('button', { name: 'Patrimoine' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bailleurs' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Factures' })).toBeInTheDocument();
  });

  it('mémorise le groupe ouvert et le restaure au montage suivant', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<SidebarNavList isOwner={false} />);

    await user.click(screen.getByRole('button', { name: 'Gestion' }));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify('Gestion'));
    unmount();

    render(<SidebarNavList isOwner={false} />);
    expect(screen.getByRole('button', { name: 'Gestion' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Patrimoine' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('ignore une valeur de stockage corrompue ou obsolète', () => {
    window.localStorage.setItem(STORAGE_KEY, '{"Patrimoine":true}');
    render(<SidebarNavList isOwner={false} />);

    for (const label of ['Patrimoine', 'Finances', 'Gestion', 'Pilotage']) {
      expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-expanded', 'false');
    }
  });
});
