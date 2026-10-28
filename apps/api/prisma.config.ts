import { defineConfig } from 'prisma/config';

// Le CLI Prisma 7 ne charge plus `.env` : chargement explicite, facultatif.
try {
  process.loadEnvFile();
} catch {
  // pas de fichier .env : variables fournies par l'environnement (CI, Docker)
}

/**
 * Configuration du CLI Prisma 7. Le CLI ne charge plus `.env` : les variables
 * viennent de l'environnement (CI, Docker) ou du `.env` local.
 *
 * Le CLI (migrate, db pull) utilise le rôle d'administration ; l'exécution
 * applicative passe par l'adaptateur pg (voir `shared/prisma/create-prisma-client.ts`).
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node --transpile-only prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL ?? '',
  },
});
