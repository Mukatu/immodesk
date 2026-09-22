import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { AppShell } from '@/components/layout/app-shell';

/**
 * Le bouton « Paramètres » de la topbar menait autrefois à un menu déroulant listant
 * les sous-pages (voir l'historique de app-shell.tsx) ; il doit désormais être un
 * simple lien vers /app/parametres, dont la bande d'onglets (layout.tsx) prend le
 * relais. Les sous-composants lourds (bascule de thème, sélecteur d'organisation,
 * navigation latérale) sont neutralisés : ils ne font pas partie de ce qui a changé
 * ici et ont leurs propres tests.
 */

let mockPathname = '/app';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    user: { fullName: 'Alix Test', phone: '069000000' },
    status: 'authenticated',
    logout: vi.fn(),
    currentOrganization: { role: 'OWNER' },
  }),
}));

vi.mock('@/components/layout/theme-toggle', () => ({
  ThemeToggle: () => null,
}));

vi.mock('@/components/layout/org-switcher', () => ({
  OrgSwitcher: () => null,
}));

vi.mock('@/components/layout/sidebar-nav', () => ({
  SidebarNavList: () => null,
}));

describe('AppShell — bouton Paramètres', () => {
  it('est un lien direct vers /app/parametres, sans menu déroulant', () => {
    mockPathname = '/app';
    render(
      <AppShell>
        <p>Contenu</p>
      </AppShell>,
    );

    const link = screen.getByRole('link', { name: 'Paramètres' });
    expect(link).toHaveAttribute('href', '/app/parametres');
    expect(link).not.toHaveAttribute('aria-haspopup');
    expect(screen.queryByRole('button', { name: 'Paramètres' })).not.toBeInTheDocument();
  });

  it('ne porte plus de sous-liste de destinations (Facturation, Webhooks, etc.)', () => {
    mockPathname = '/app';
    render(
      <AppShell>
        <p>Contenu</p>
      </AppShell>,
    );

    expect(screen.queryByText('Facturation')).not.toBeInTheDocument();
    expect(screen.queryByText('Webhooks')).not.toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('marque le lien Paramètres courant quand une sous-page est active', () => {
    mockPathname = '/app/parametres/facturation';
    render(
      <AppShell>
        <p>Contenu</p>
      </AppShell>,
    );

    expect(screen.getByRole('link', { name: 'Paramètres' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
