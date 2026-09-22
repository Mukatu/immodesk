'use client';

import * as React from 'react';
import { Download, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

/** Mémorise durablement la fermeture de la bannière (ne plus la reproposer). */
const DISMISSED_KEY = 'immodesk.install-prompt-dismissed';

/**
 * L'événement `beforeinstallprompt` (Chrome/Android) n'est pas encore dans le lib DOM
 * standard de TypeScript : on type localement l'interface utilisée ici.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isStandalone(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

function wasDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Bannière discrète invitant à installer Immodesk sur l'écran d'accueil (mobile
 * uniquement). N'apparaît que si le navigateur a déclenché `beforeinstallprompt`,
 * que l'app ne tourne pas déjà en mode installé, et que l'utilisateur n'a pas
 * déjà fermé la bannière auparavant.
 */
export function InstallPrompt() {
  const [deferredEvent, setDeferredEvent] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (isStandalone() || wasDismissed()) {
      return;
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = React.useCallback(() => {
    if (!deferredEvent) {
      return;
    }
    void deferredEvent.prompt().then(() => {
      setDeferredEvent(null);
    });
  }, [deferredEvent]);

  const handleDismiss = React.useCallback(() => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // Stockage indisponible (navigation privée stricte) : la bannière pourra
      // se réafficher à la prochaine visite, ce qui reste acceptable.
    }
  }, []);

  if (!deferredEvent || dismissed) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Installer l'application"
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 shadow-lg sm:hidden"
    >
      <p className="text-sm font-medium text-card-foreground">Installer Immodesk</p>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" className="h-11" onClick={handleInstall}>
          <Download className="size-4" aria-hidden="true" />
          Installer
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Fermer la proposition d'installation"
          onClick={handleDismiss}
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
