import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import OnboardingOrganisationPage from '@/app/onboarding/organisation/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ refresh: vi.fn() }),
}));

vi.mock('@/lib/api/hooks/use-organizations', () => ({
  useCreateOrganization: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
}));

async function goToIdentityStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Suivant' }));
}

async function selectType(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('radio', { name: new RegExp(name) }));
}

describe('OnboardingOrganisationPage — libellé du nom', () => {
  it('demande « Nom et prénom » pour une agence (comportement par défaut), avec le nom commercial', async () => {
    const user = userEvent.setup();
    render(<OnboardingOrganisationPage />);
    await goToIdentityStep(user);

    expect(screen.getByLabelText('Nom et prénom')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Jean Moukala')).toBeInTheDocument();
    expect(screen.getByLabelText('Nom commercial (optionnel)')).toBeInTheDocument();
  });

  it('affiche « Nom et prénom requis. » quand le champ est vide pour une agence', async () => {
    const user = userEvent.setup();
    render(<OnboardingOrganisationPage />);
    await goToIdentityStep(user);

    await user.click(screen.getByRole('button', { name: 'Suivant' }));

    expect(await screen.findByText('Nom et prénom requis.')).toBeInTheDocument();
  });

  it('demande « Nom et prénom » pour un bailleur indépendant, sans nom commercial', async () => {
    const user = userEvent.setup();
    render(<OnboardingOrganisationPage />);
    await selectType(user, 'Bailleur indépendant');
    await goToIdentityStep(user);

    expect(screen.getByLabelText('Nom et prénom')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Jean Moukala')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nom commercial (optionnel)')).not.toBeInTheDocument();
  });

  it('affiche « Nom et prénom requis. » quand le champ est vide pour un bailleur indépendant', async () => {
    const user = userEvent.setup();
    render(<OnboardingOrganisationPage />);
    await selectType(user, 'Bailleur indépendant');
    await goToIdentityStep(user);

    await user.click(screen.getByRole('button', { name: 'Suivant' }));

    expect(await screen.findByText('Nom et prénom requis.')).toBeInTheDocument();
  });
});
