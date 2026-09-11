import { existsSync } from 'node:fs';

/**
 * Emplacements usuels d'un navigateur Chromium, par plateforme.
 *
 * Chrome d'abord : c'est le navigateur de référence de Puppeteer, celui sur
 * lequel le protocole DevTools est éprouvé. Edge, pourtant bâti sur le même
 * moteur Blink, ne démarre pas avec toutes les versions de Puppeteer (le
 * processus se termine aussitôt, sans message) : il reste en recours, jamais
 * en premier choix.
 */
const WELL_KNOWN_PATHS: Readonly<Record<string, readonly string[]>> = {
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Chromium\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/usr/bin/microsoft-edge',
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
};

export type BrowserSource = 'CONFIG' | 'BUNDLED' | 'SYSTEM';

export interface BrowserCandidate {
  executablePath: string;
  source: BrowserSource;
}

export interface BrowserLocation {
  /** Candidats à essayer, dans l'ordre de préférence. Vide = aucun rendu. */
  candidates: BrowserCandidate[];
}

/**
 * Recense les navigateurs de rendu utilisables, dans cet ordre :
 *
 *   1. `PUPPETEER_EXECUTABLE_PATH` — la décision de l'exploitant prime ;
 *   2. le Chromium empaqueté par Puppeteer, quand il a bien été téléchargé ;
 *   3. les Chrome, Chromium et Edge déjà installés sur la machine.
 *
 * POURQUOI UNE LISTE ET NON UN SEUL CHEMIN — le téléchargement du Chromium
 * empaqueté (≈ 180 Mo) est bloqué dans certains environnements de build, dont
 * celui de ce dépôt (politique pnpm sur les scripts d'installation). Le repli
 * système est donc la voie normale ici, et l'existence d'un fichier ne
 * garantit pas qu'il démarre : Edge, présent sur tout Windows, refuse de se
 * lancer avec certaines versions de Puppeteer. Essayer les candidats l'un
 * après l'autre est la seule façon d'être robuste sans configuration.
 *
 * Aucun candidat n'est pas une erreur fatale : l'API démarre, le worker PDF
 * reste éteint et la route de génération répond `503
 * LEASES.CONTRACT_UNAVAILABLE`. La prévisualisation HTML, elle, fonctionne.
 */
export async function locateBrowser(
  configuredPath: string | undefined,
  bundledPath: () => string | Promise<string>,
): Promise<BrowserLocation> {
  const candidates: BrowserCandidate[] = [];
  const add = (executablePath: string | undefined, source: BrowserSource): void => {
    if (!executablePath || !existsSync(executablePath)) return;
    if (candidates.some((c) => c.executablePath === executablePath)) return;
    candidates.push({ executablePath, source });
  };

  add(configuredPath, 'CONFIG');

  try {
    add(await bundledPath(), 'BUNDLED');
  } catch {
    // `executablePath()` lève quand aucun navigateur n'a été téléchargé :
    // ce n'est pas une anomalie, on passe au repli système.
  }

  for (const candidate of WELL_KNOWN_PATHS[process.platform] ?? []) {
    add(candidate, 'SYSTEM');
  }

  return { candidates };
}
