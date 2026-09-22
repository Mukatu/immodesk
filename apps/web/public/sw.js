/*
 * Service worker minimal d'Immodesk.
 *
 * Pourquoi ce fichier existe : sur Chrome/Android, l'événement `beforeinstallprompt`
 * (qui déclenche la bannière d'installation, voir src/components/layout/install-prompt.tsx)
 * n'est émis que si le site enregistre un service worker possédant un gestionnaire
 * `fetch`. C'est la seule raison de sa présence.
 *
 * Ce qu'il ne fait volontairement PAS : mettre en cache l'application, ses routes,
 * ou les réponses de l'API. Immodesk manipule des données financières (loyers,
 * quittances, soldes) : un service worker qui sert une page ou une réponse API
 * périmée serait plus dangereux que pas de service worker du tout. La stratégie
 * ici est donc « réseau d'abord, sans cache de navigation » — en pratique, aucun
 * cache de navigation : toutes les requêtes GET de navigation/HTML et toutes les
 * requêtes vers /api/ passent directement au réseau, sans jamais toucher au cache.
 *
 * Seule exception tolérée : une page de repli hors ligne statique (OFFLINE_URL),
 * mise en cache une fois à l'installation, pour éviter l'écran d'erreur brut du
 * navigateur si la navigation échoue faute de réseau. Le vrai mode hors ligne
 * d'Immodesk est la responsabilité de l'application Flutter, pas de ce tableau
 * de bord web.
 */

const CACHE_NAME = 'immodesk-sw-v1';
const OFFLINE_URL = '/hors-ligne.html';

self.addEventListener('install', (event) => {
  // On passe immédiatement en attente active : pas besoin d'attendre la fermeture
  // de tous les onglets, ce service worker ne change jamais le contenu servi.
  self.skipWaiting();

  // Mise en cache de la seule page de repli hors ligne. Si le fichier n'existe pas
  // encore côté public/, on ignore l'échec pour ne pas bloquer l'installation.
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(OFFLINE_URL))
      .catch(() => undefined),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Supprime tout cache obsolète nous appartenant (versions précédentes de ce
      // service worker) : jamais d'accumulation silencieuse de caches périmés.
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      // Prend le contrôle des onglets déjà ouverts sans attendre un rechargement.
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // On ignore explicitement tout ce qui n'est pas une simple lecture : les requêtes
  // non-GET (POST/PUT/PATCH/DELETE) ne doivent jamais transiter par une logique de
  // cache, quelle qu'elle soit.
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Les routes /api/ ne sont jamais interceptées : toujours le réseau, toujours les
  // données les plus fraîches.
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Réseau d'abord, sans mise en cache de la réponse. En cas d'échec réseau sur une
  // navigation (utilisateur hors ligne), on retombe sur la page de repli statique
  // mise en cache à l'installation, plutôt que sur l'écran d'erreur du navigateur.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL).then((res) => res ?? Response.error())),
    );
    return;
  }

  // Pour tout le reste (assets, scripts, styles…), on laisse simplement passer au
  // réseau : la seule présence de ce gestionnaire `fetch` suffit au critère
  // d'installabilité, aucune interception de la réponse n'est nécessaire.
});

/*
 * Trappe de secours (à utiliser si un utilisateur reste bloqué avec une version
 * fautive de ce service worker) :
 *
 * 1. Remplacer temporairement le contenu de ce fichier (public/sw.js) par :
 *
 *      self.addEventListener('install', () => self.skipWaiting());
 *      self.addEventListener('activate', () => {
 *        self.registration.unregister();
 *        self.clients.matchAll({ type: 'window' }).then((clients) => {
 *          clients.forEach((client) => client.navigate(client.url));
 *        });
 *      });
 *
 * 2. Déployer cette version : chaque client la récupère au prochain chargement
 *    (le navigateur revérifie /sw.js périodiquement), se désinscrit tout seul,
 *    puis recharge — sans que l'utilisateur ait besoin de vider son navigateur.
 * 3. Une fois tous les clients purgés, restaurer la version normale ci-dessus
 *    (ou retirer le service worker si le problème n'est pas résolu).
 */
