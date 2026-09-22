import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { InstallPrompt } from '@/components/layout/install-prompt';

const STORAGE_KEY = 'immodesk.install-prompt-dismissed';
const REGION_NAME = "Installer l'application";

/**
 * `beforeinstallprompt` n'est pas un type d'événement standard du DOM : on construit un
 * Event ordinaire et on lui ajoute les propriétés attendues (prompt, userChoice), comme
 * le ferait Chrome/Android.
 */
function fireBeforeInstallPrompt() {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  };
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe('InstallPrompt', () => {
  it("n'affiche rien tant que beforeinstallprompt n'a pas eu lieu", () => {
    render(<InstallPrompt />);

    expect(screen.queryByRole('region', { name: REGION_NAME })).not.toBeInTheDocument();
  });

  it('affiche la bannière après beforeinstallprompt', () => {
    render(<InstallPrompt />);
    fireBeforeInstallPrompt();

    expect(screen.getByRole('region', { name: REGION_NAME })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Installer' })).toBeInTheDocument();
  });

  it('la fermeture masque la bannière et mémorise le choix', async () => {
    const user = userEvent.setup();
    render(<InstallPrompt />);
    fireBeforeInstallPrompt();

    await user.click(screen.getByRole('button', { name: "Fermer la proposition d'installation" }));

    expect(screen.queryByRole('region', { name: REGION_NAME })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it("ne réaffiche pas la bannière si l'utilisateur l'a déjà fermée auparavant", () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    render(<InstallPrompt />);
    fireBeforeInstallPrompt();

    expect(screen.queryByRole('region', { name: REGION_NAME })).not.toBeInTheDocument();
  });

  it("appelle prompt() sur l'événement gardé lors du clic sur Installer", async () => {
    const user = userEvent.setup();
    render(<InstallPrompt />);
    const event = fireBeforeInstallPrompt();

    await user.click(screen.getByRole('button', { name: 'Installer' }));

    expect(event.prompt).toHaveBeenCalledOnce();
  });
});
