import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../../generated/prisma/client';

/** Valeur par défaut de `pg` : 10 connexions par pool. */
export const DEFAULT_POOL_MAX = 10;

/**
 * Fabrique un `PrismaClient` branché sur l'adaptateur `pg` (obligatoire avec
 * Prisma 7 : plus de moteur Rust ni de `datasources` dans le constructeur).
 */
export function createPrismaClient(
  connectionString: string,
  log: Prisma.LogLevel[] = ['error'],
  /** Taille maximale du pool `pg` (DATABASE_POOL_MAX côté application). */
  max = DEFAULT_POOL_MAX,
): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, max }), log });
}
