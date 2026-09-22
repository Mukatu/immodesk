'use client';

import * as React from 'react';

/**
 * Enregistre le service worker minimal (public/sw.js) requis par Chrome/Android
 * pour émettre l'événement `beforeinstallprompt` (voir install-prompt.tsx).
 *
 * Uniquement en production : en développement, un service worker interfère avec
 * le rechargement à chaud (HMR) et compliquerait le débogage sans aucun bénéfice,
 * puisque son seul rôle est de satisfaire un critère d'installabilité.
 *
 * L'enregistrement est protégé par un try/catch : il échoue silencieusement en
 * contexte non sécurisé (HTTP simple, `serviceWorker` absent de `navigator`...),
 * ce qui n'est pas une erreur à remonter à l'utilisateur — l'application reste
 * pleinement fonctionnelle sans service worker.
 */
export function ServiceWorkerRegistration(): null {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    if (!('serviceWorker' in navigator)) {
      return;
    }

    try {
      void navigator.serviceWorker.register('/sw.js');
    } catch {
      // Contexte non sécurisé ou navigateur restrictif : pas d'installabilité,
      // mais l'application fonctionne normalement sans service worker.
    }
  }, []);

  return null;
}
