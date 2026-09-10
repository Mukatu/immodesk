/**
 * Chargement de l'environnement des tests d'intégration.
 *
 * Les tests s'exécutent contre la pile Docker locale
 * (infra/docker/docker-compose.yml) : PostgreSQL et Redis doivent être
 * démarrés. Aucune base n'est simulée : la RLS ne peut se vérifier que sur
 * un vrai PostgreSQL.
 */
// `@prisma/client` charge `.env` dès son import ; cet import de tête déclenche
// ce chargement AVANT que le corps du module ne pose les valeurs de test, qui
// seraient sinon écrasées ensuite (notamment OTP_DEV_CODE).
import '@prisma/client';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

for (const candidate of ['.env.test', '.env']) {
  const path = resolve(__dirname, '../../', candidate);
  if (existsSync(path)) {
    loadEnv({ path, override: false });
  }
}

process.env.NODE_ENV = 'test';
// Journalisation muette : la sortie de test doit rester lisible.
process.env.LOG_LEVEL = 'silent';
// Le code fixe de développement est neutralisé : les tests exercent le vrai
// chemin de hachage et de vérification des codes. Une chaîne vide est traitée
// comme « non défini » par la configuration, et empêche tout rechargement de
// `.env` de le réintroduire (dotenv n'écrase pas une variable déjà définie).
process.env.OTP_DEV_CODE = '';

process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://immodesk_app:immodesk_app@localhost:5440/immodesk';
process.env.DATABASE_ADMIN_URL =
  process.env.DATABASE_ADMIN_URL ?? 'postgresql://immodesk:immodesk@localhost:5440/immodesk';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6390';
process.env.JWT_ALGORITHM = process.env.JWT_ALGORITHM ?? 'HS256';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'secret-de-test-immodesk-api';
process.env.CURSOR_SECRET = process.env.CURSOR_SECRET ?? 'curseur-de-test-immodesk-api';
process.env.OTP_PEPPER = process.env.OTP_PEPPER ?? 'poivre-de-test-immodesk';
process.env.S3_ENDPOINT = process.env.S3_ENDPOINT ?? 'http://localhost:9010';
process.env.S3_BUCKET = process.env.S3_BUCKET ?? 'immodesk';
process.env.S3_ACCESS_KEY = process.env.S3_ACCESS_KEY ?? 'immodesk';
process.env.S3_SECRET_KEY = process.env.S3_SECRET_KEY ?? 'immodesk123';
process.env.SWAGGER_ENABLED = 'false';
