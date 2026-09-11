import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

/** `process.getBuiltinModule` (Node 22.3+) : le VRAI module natif. */
type BuiltinModuleGetter = (name: string) => unknown;

type PuppeteerModule = typeof import('puppeteer');

/**
 * Chargement de Puppeteer, qui n'est publié qu'en ESM depuis la v23.
 *
 * L'API est compilée en CommonJS (`"type": "commonjs"`, `tsc` → `dist/`), et
 * TypeScript réécrirait tout `import ... from 'puppeteer'` en `require()`
 * passant par le registre de modules de l'exécutant — celui de Node en
 * production, celui de Jest en test. Or :
 *
 *   * le runtime CommonJS de Jest 29 ne sait pas charger un module ESM et
 *     échoue dès l'analyse du fichier ;
 *   * `import()` dynamique, dans le contexte VM de Jest, exige le drapeau
 *     `--experimental-vm-modules`, que l'on ne veut pas imposer à toute la
 *     suite d'intégration pour un seul paquet.
 *
 * La solution est `process.getBuiltinModule('module')` (Node 22.3+), qui rend
 * le module natif LUI-MÊME, hors de tout registre de test — `require('node:
 * module')` sous Jest rend, lui, la version instrumentée par Jest, dont le
 * `createRequire` retombe dans le registre de test et échoue sur `export`.
 * Le `createRequire` natif ainsi obtenu produit un vrai `require` de Node, et
 * Node 22.12+ sait requérir un module ESM dépourvu d'attente de tête — ce qui
 * est le cas de Puppeteer. Le même chemin de code fonctionne donc en
 * production comme sous Jest.
 *
 * Deux replis conservent la robustesse sur d'autres runtimes : le
 * `createRequire` importé normalement, puis un `import()` dynamique construit
 * par `new Function` pour échapper à la réécriture du compilateur.
 *
 * Le module est mis en cache : le chargement coûte une dizaine de
 * millisecondes, et le worker enchaîne les rendus.
 */
const nodeRequire = resolveNodeRequire();

function resolveNodeRequire(): NodeRequire {
  const getBuiltinModule = (process as { getBuiltinModule?: BuiltinModuleGetter }).getBuiltinModule;
  if (typeof getBuiltinModule === 'function') {
    const native = getBuiltinModule('module') as { createRequire?: typeof createRequire };
    if (typeof native?.createRequire === 'function') return native.createRequire(__filename);
  }
  return createRequire(__filename);
}

const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<unknown>;

let cached: Promise<PuppeteerModule> | null = null;

export function loadPuppeteer(): Promise<PuppeteerModule> {
  cached ??= load();
  return cached;
}

async function load(): Promise<PuppeteerModule> {
  try {
    return unwrap(nodeRequire('puppeteer'));
  } catch {
    const resolved = pathToFileURL(nodeRequire.resolve('puppeteer')).href;
    return unwrap(await dynamicImport(resolved));
  }
}

/** Le paquet expose l'instance en export par défaut ET en exports nommés. */
function unwrap(module: unknown): PuppeteerModule {
  const candidate = module as { default?: PuppeteerModule } & PuppeteerModule;
  return candidate.default ?? candidate;
}
