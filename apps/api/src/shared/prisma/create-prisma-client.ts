import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../../generated/prisma/client';

/**
 * Fabrique un `PrismaClient` branché sur l'adaptateur `pg` (obligatoire avec
 * Prisma 7 : plus de moteur Rust ni de `datasources` dans le constructeur).
 */
export function createPrismaClient(
  connectionString: string,
  log: Prisma.LogLevel[] = ['error'],
): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }), log });
}
