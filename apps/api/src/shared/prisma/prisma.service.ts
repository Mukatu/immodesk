import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/config.schema';
import { currentTenant, requireTenant } from '../tenant/tenant-context';

/** Client transactionnel Prisma exposé aux dépôts. */
export type TenantClient = Prisma.TransactionClient;

/** UUID nul : « aucun utilisateur » dans le contexte PostgreSQL. */
export const NIL_UUID = '00000000-0000-0000-0000-000000000000';

/**
 * Tables globales : elles ne portent pas de `organization_id` et ne sont donc
 * pas soumises à la RLS. L'autorisation y est purement applicative
 * (JWT + organization_members). Toute autre table DOIT être lue ou écrite
 * dans un `withTenant`.
 */
export const GLOBAL_TABLES = [
  'users',
  'user_credentials',
  'otp_codes',
  'refresh_tokens',
  'subscription_plans',
  'referral_programs',
  'referral_partners',
  'referrals',
  'referral_commissions',
  'referral_payouts',
] as const;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    super({
      datasources: { db: { url: config.DATABASE_URL } },
      log: config.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connexion PostgreSQL établie (rôle applicatif, soumis à la RLS).');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Ouvre une transaction et y positionne le contexte multi-tenant avant tout
   * travail applicatif.
   *
   * `set_config(..., true)` équivaut à `SET LOCAL` : le réglage est porté par
   * la transaction et disparaît au COMMIT/ROLLBACK — indispensable avec un
   * pool de connexions, sinon une organisation « fuiterait » sur la requête
   * suivante servie par la même connexion.
   *
   * Toute route d'organisation passe par ici : c'est le seul endroit du code
   * qui active la RLS.
   */
  async withTenant<T>(
    organizationId: string,
    userId: string | null,
    fn: (tx: TenantClient) => Promise<T>,
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel; timeout?: number },
  ): Promise<T> {
    return this.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_organization_id', ${organizationId}, true)`;
        // Jamais de chaîne vide : certaines policies transtypent
        // `app.current_user_id` en UUID, et `''::uuid` lèverait une erreur.
        // L'UUID nul désigne « aucun utilisateur » (tâche de fond, envoi
        // automatique) sans jamais correspondre à une ligne réelle.
        await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId ?? NIL_UUID}, true)`;
        return fn(tx);
      },
      {
        isolationLevel: options?.isolationLevel ?? Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: options?.timeout ?? 15_000,
        maxWait: 5_000,
      },
    );
  }

  /**
   * Variante qui reprend le contexte courant d'`AsyncLocalStorage`.
   * Échoue si aucun contexte n'est ouvert, plutôt que de risquer une lecture
   * non filtrée.
   */
  async withCurrentTenant<T>(fn: (tx: TenantClient) => Promise<T>): Promise<T> {
    const ctx = requireTenant();
    return this.withTenant(ctx.organizationId, ctx.userId, fn);
  }

  /** Contexte courant si présent, sans lever d'erreur. */
  tenantOrNull(): ReturnType<typeof currentTenant> {
    return currentTenant();
  }

  /**
   * Transaction sur les tables GLOBALES uniquement (authentification).
   * Aucun `set_config` : ces tables n'ont pas de policy d'isolation.
   */
  async withGlobal<T>(fn: (tx: TenantClient) => Promise<T>): Promise<T> {
    return this.$transaction(fn, {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: 15_000,
      maxWait: 5_000,
    });
  }
}
