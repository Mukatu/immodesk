import 'reflect-metadata';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createApp } from '../src/bootstrap';
import { buildOpenApiDocument } from '../src/modules/platform/infrastructure/openapi';
import { AppConfigService } from '../src/shared/config/config.module';

/**
 * Écrit le contrat OpenAPI 3.1 dans `docs/api/openapi.json`.
 * Ce fichier devient la source de vérité du contrat, remplaçant
 * `docs/api/phase0-contract.md`.
 */
async function main(): Promise<void> {
  const app = await createApp();
  const prefix = app.get(AppConfigService).get('API_GLOBAL_PREFIX');
  const document = buildOpenApiDocument(app, prefix);

  const target = resolve(__dirname, '../../../docs/api/openapi.json');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`, 'utf8');

  const routes = Object.keys(document.paths ?? {}).length;
  console.info(`Contrat OpenAPI ${document.openapi} écrit : ${target} (${routes} chemins).`);

  await app.close();
}

main().catch((error) => {
  console.error("Échec de l'export OpenAPI :", error);
  process.exitCode = 1;
});
