import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import ParametresLayout from '@/app/app/parametres/layout';

/**
 * La bande d'onglets remplace le menu déroulant de la topbar (app-shell.tsx) :
 * chaque onglet est un vrai lien vers sa propre adresse, l'onglet courant est déduit
 * de l'URL (pas d'état interne façon components/ui/tabs.tsx).
 */

let mockPathname = '/app/parametres';
let mockRole = 'OWNER';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ currentOrganization: { role: mockRole } }),
}));

const ALL_LABELS = [
  'Général',
  'Facturation',
  'Paiements',
  'Rapprochement bancaire',
  'Contrat',
  'Messages',
  'Webhooks',
  'Tarifs',
  'Import de portefeuille',
];

describe('ParametresLayout — bande d’onglets', () => {
  it('rend une navigation étiquetée avec les neuf destinations pour un propriétaire', () => {
    mockRole = 'OWNER';
    mockPathname = '/app/parametres';
    render(
      <ParametresLayout>
        <p>Contenu</p>
      </ParametresLayout>,
    );

    const nav = screen.getByRole('navigation', { name: 'Navigation paramètres' });
    for (const label of ALL_LABELS) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
    expect(nav.querySelectorAll('a')).toHaveLength(9);
  });

  it('masque Webhooks et Import de portefeuille pour un rôle sans ces droits', () => {
    mockRole = 'COLLECTOR';
    mockPathname = '/app/parametres';
    render(
      <ParametresLayout>
        <p>Contenu</p>
      </ParametresLayout>,
    );

    expect(screen.queryByRole('link', { name: 'Webhooks' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Import de portefeuille' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Général' })).toBeInTheDocument();
  });

  it('affiche Import de portefeuille pour un gérant (MANAGER), mais pas Webhooks', () => {
    mockRole = 'MANAGER';
    mockPathname = '/app/parametres';
    render(
      <ParametresLayout>
        <p>Contenu</p>
      </ParametresLayout>,
    );

    expect(screen.getByRole('link', { name: 'Import de portefeuille' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Webhooks' })).not.toBeInTheDocument();
  });

  it('marque « Général » courant sur /app/parametres, et non sur ses sous-pages', () => {
    mockRole = 'OWNER';
    mockPathname = '/app/parametres';
    render(
      <ParametresLayout>
        <p>Contenu</p>
      </ParametresLayout>,
    );
    expect(screen.getByRole('link', { name: 'Général' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Facturation' })).not.toHaveAttribute('aria-current');
  });

  it('marque l’onglet de la sous-page courante, et pas « Général »', () => {
    mockRole = 'OWNER';
    mockPathname = '/app/parametres/facturation';
    render(
      <ParametresLayout>
        <p>Contenu</p>
      </ParametresLayout>,
    );
    expect(screen.getByRole('link', { name: 'Facturation' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Général' })).not.toHaveAttribute('aria-current');
  });

  it('rend le contenu de la page en dessous des onglets', () => {
    mockRole = 'OWNER';
    mockPathname = '/app/parametres';
    render(
      <ParametresLayout>
        <p>Contenu de la sous-page</p>
      </ParametresLayout>,
    );
    expect(screen.getByText('Contenu de la sous-page')).toBeInTheDocument();
  });
});
