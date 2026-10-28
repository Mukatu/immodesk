import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';

/**
 * Régression : une fois `app.current_*` posé par `set_config(..., true)` sur
 * une connexion, PostgreSQL le ramène à une chaîne VIDE (pas à NULL) à la fin
 * de la transaction. Sur une connexion de pool réutilisée, une policy écrite
 * `current_setting('app.x', true)::uuid` levait `invalid input syntax for
 * type uuid: ""` — par exemple à la lecture des drapeaux globaux
 * (`ReadOnlyService`), silencieusement ignorée (fail-open).
 *
 * Le pool est limité à UNE connexion pour garantir sa réutilisation.
 */
describe('RLS : contexte vidé sur une connexion de pool réutilisée', () => {
  let app: PrismaClient;

  beforeAll(async () => {
    app = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL as string, max: 1 }),
      log: [],
    });
    await app.$connect();
  });

  afterAll(async () => {
    await app.$disconnect();
  });

  async function withContext(): Promise<void> {
    await app.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_organization_id', '00000000-0000-0000-0000-000000000000', true)`;
      await tx.$executeRaw`SELECT set_config('app.current_user_id', '00000000-0000-0000-0000-000000000000', true)`;
    });
  }

  it('laisse le réglage à vide (et non NULL) après la transaction', async () => {
    await withContext();
    const [row] = await app.$queryRaw<Array<{ org: string | null }>>`
      SELECT current_setting('app.current_organization_id', true) AS org`;
    expect(row.org).toBe('');
  });

  it('lit les drapeaux globaux sans erreur après un contexte libéré', async () => {
    await withContext();
    // Peu importe que la ligne existe : seule l'absence d'erreur est vérifiée.
    await expect(
      app
        .$transaction((tx) =>
          tx.feature_flags.findFirst({ where: { organization_id: null, key: 'read_only_mode' } }),
        )
        .then(() => 'ok'),
    ).resolves.toBe('ok');
  });

  it('reste aveugle (zéro ligne, sans erreur) sur les tables à tenant et à utilisateur', async () => {
    await withContext();
    for (const table of ['organizations', 'organization_members', 'audit_logs']) {
      const rows = await app.$queryRawUnsafe<unknown[]>(`SELECT * FROM "${table}" LIMIT 5`);
      expect({ table, rows }).toEqual({ table, rows: [] });
    }
    const partners = await app.$queryRawUnsafe<unknown[]>(
      `SELECT * FROM referral_partners LIMIT 5`,
    );
    expect(partners).toEqual([]);
  });
});
