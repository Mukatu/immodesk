import { PrismaClient } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';
import { withAuditTriggersDisabled } from './helpers';
import { buildInsert, listTenantTables, planMinimalRow, type Anchors } from './rls-matrix';

/**
 * Tables de la phase 0 dont l'isolation DOIT être démontrée.
 *
 * Les quatre tables d'authentification (`users`, `user_credentials`,
 * `otp_codes`, `refresh_tokens`) sont GLOBALES par conception : un même
 * utilisateur appartient à plusieurs organisations et se connecte avant
 * d'en choisir une. Elles ne portent pas `organization_id`, ne relèvent
 * donc pas de la RLS, et sont vérifiées séparément (absence de colonne,
 * autorisation purement applicative).
 */
const PHASE0_TENANT_TABLES = [
  'organizations',
  'organization_settings',
  'organization_members',
  'invitations',
  'api_keys',
  'audit_logs',
  'feature_flags',
  'idempotency_keys',
  'notification_templates',
  'message_logs',
] as const;

const PHASE0_GLOBAL_TABLES = ['users', 'user_credentials', 'otp_codes', 'refresh_tokens'] as const;

interface Fixture {
  organizationId: string;
  /**
   * Trois utilisateurs : le membre OWNER, puis deux comptes de réserve.
   * `organization_members` est unique par (organisation, utilisateur) : sans
   * comptes distincts, la ligne de balayage et la tentative d'écriture
   * croisée échoueraient sur l'unicité au lieu de la policy RLS.
   */
  userIds: [string, string, string];
  /** Lignes métier servant de cible aux clés étrangères obligatoires. */
  anchors: Map<string, string>;
  slug: string;
}

describe('Isolation multi-tenant (Row Level Security)', () => {
  let admin: PrismaClient;
  let app: PrismaClient;
  let orgA: Fixture;
  let orgB: Fixture;

  const covered: string[] = [];
  const skipped: Array<{ table: string; reason: string }> = [];

  beforeAll(async () => {
    admin = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_ADMIN_URL as string } },
      log: [],
    });
    app = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL as string } },
      log: [],
    });
    await Promise.all([admin.$connect(), app.$connect()]);

    orgA = await createFixture(admin, 'A');
    orgB = await createFixture(admin, 'B');
  }, 60_000);

  afterAll(async () => {
    if (orgA) await dropFixture(admin, orgA);
    if (orgB) await dropFixture(admin, orgB);
    await Promise.all([admin.$disconnect(), app.$disconnect()]);
  });

  it('confirme que le rôle applicatif est bien soumis à la RLS', async () => {
    const [role] = await app.$queryRawUnsafe<
      Array<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean }>
    >(`SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`);

    expect(role.rolname).toBe('immodesk_app');
    // Sans cela, toutes les policies seraient contournées silencieusement.
    expect(role.rolsuper).toBe(false);
    expect(role.rolbypassrls).toBe(false);
  });

  it('active RLS et FORCE RLS sur toutes les tables portant organization_id', async () => {
    const tables = await listTenantTables(admin);
    expect(tables.length).toBeGreaterThanOrEqual(50);

    const unprotected = await admin.$queryRawUnsafe<Array<{ relname: string }>>(
      `SELECT c.relname
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
          AND c.relname = ANY($1::text[])
          AND (c.relrowsecurity = false OR c.relforcerowsecurity = false)`,
      [...tables, 'organizations'],
    );
    // FORCE est indispensable : sans lui, le propriétaire des tables
    // contournerait les policies.
    expect(unprotected.map((r) => r.relname)).toEqual([]);

    const withoutPolicy = await admin.$queryRawUnsafe<Array<{ relname: string }>>(
      `SELECT c.relname
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
          AND c.relname = ANY($1::text[])
          AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)`,
      [...tables, 'organizations'],
    );
    expect(withoutPolicy.map((r) => r.relname)).toEqual([]);
  });

  it('isole `organizations` par sa clé primaire', async () => {
    const visibleFromA = await asOrganization(app, orgA, (tx) =>
      tx.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM organizations`),
    );
    expect(visibleFromA.map((r) => r.id)).toEqual([orgA.organizationId]);

    const bFromA = await asOrganization(app, orgA, (tx) =>
      tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM organizations WHERE id = $1::uuid`,
        orgB.organizationId,
      ),
    );
    expect(bFromA).toEqual([]);
  });

  it('ne retourne jamais de ligne hors de tout contexte de tenant', async () => {
    // Deux comportements sûrs coexistent, selon l'état de la connexion :
    //
    //  - connexion neuve : `current_setting('app.current_organization_id',
    //    true)` vaut NULL, la comparaison est NULL, aucune ligne ne passe ;
    //  - connexion ayant DÉJÀ porté un contexte : PostgreSQL ramène le
    //    paramètre personnalisé à sa valeur de réinitialisation, qui est la
    //    chaîne VIDE et non NULL. `''::uuid` lève alors une erreur.
    //
    // Les deux issues sont acceptables — la seule qui ne le serait pas est
    // le retour de lignes. C'est ce que ce test verrouille.
    for (const table of ['organizations', 'organization_members', 'audit_logs']) {
      let rows: unknown[] | null = null;
      let failed = false;
      try {
        rows = await app.$queryRawUnsafe<Array<unknown>>(`SELECT * FROM "${table}" LIMIT 5`);
      } catch {
        failed = true;
      }
      expect({ table, leaked: rows ?? [] }).toEqual({ table, leaked: [] });
      expect({ table, safe: failed || (rows?.length ?? 0) === 0 }).toEqual({ table, safe: true });
    }
  });

  it('rend une connexion neuve totalement aveugle sans contexte', async () => {
    // Cas déterministe : un client qui n'a jamais posé de contexte.
    const fresh = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL as string } },
      log: [],
    });
    try {
      await fresh.$connect();
      for (const table of ['organizations', 'organization_members', 'audit_logs']) {
        const rows = await fresh.$queryRawUnsafe<Array<unknown>>(
          `SELECT * FROM "${table}" LIMIT 5`,
        );
        expect({ table, rows }).toEqual({ table, rows: [] });
      }
    } finally {
      await fresh.$disconnect();
    }
  });

  it('balaie toutes les tables à organization_id : lecture croisée impossible, écriture croisée rejetée', async () => {
    const tables = (await listTenantTables(admin)).filter((t) => t !== 'organizations');
    const enumCache = new Map<string, string[]>();

    for (const table of tables) {
      const idA = uuidv7();
      const idB = uuidv7();

      const planA = await planMinimalRow(admin, table, idA, anchorsFor(orgA, 1), enumCache);
      if (planA.kind === 'skipped') {
        skipped.push({ table, reason: planA.reason });
        continue;
      }
      const planB = await planMinimalRow(admin, table, idB, anchorsFor(orgB, 1), enumCache);
      if (planB.kind === 'skipped') {
        skipped.push({ table, reason: planB.reason });
        continue;
      }

      // --- Insertion d'une ligne dans chaque organisation ---------------
      try {
        await insertAs(app, orgA, table, planA.values);
        await insertAs(app, orgB, table, planB.values);
      } catch (error) {
        skipped.push({
          table,
          reason: `insertion minimale refusée (contrainte métier) : ${firstLine(error)}`,
        });
        await cleanupRows(admin, table, [idA, idB]);
        continue;
      }

      // --- 1. Lecture sous A : aucune ligne de B ------------------------
      const visibleFromA = await asOrganization(app, orgA, (tx) =>
        tx.$queryRawUnsafe<Array<{ id: string; organization_id: string | null }>>(
          `SELECT id, organization_id FROM "${table}"`,
        ),
      );
      const bLeaked = visibleFromA.filter((r) => r.organization_id === orgB.organizationId);
      expect({ table, bLeaked }).toEqual({ table, bLeaked: [] });
      expect({ table, seesOwn: visibleFromA.some((r) => r.id === idA) }).toEqual({
        table,
        seesOwn: true,
      });

      // --- 2. Accès direct par identifiant : introuvable ----------------
      const directFromA = await asOrganization(app, orgA, (tx) =>
        tx.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM "${table}" WHERE id = $1::uuid`,
          idB,
        ),
      );
      expect({ table, directFromA }).toEqual({ table, directFromA: [] });

      // --- 3. Écriture sous A avec l'organisation de B : rejetée --------
      const foreignId = uuidv7();
      const foreignPlan = await planMinimalRow(
        admin,
        table,
        foreignId,
        anchorsFor(orgB, 2),
        enumCache,
      );
      if (foreignPlan.kind === 'ready') {
        let rejected = false;
        let message = '';
        try {
          await insertAs(app, orgA, table, foreignPlan.values);
        } catch (error) {
          rejected = true;
          message = String((error as Error).message);
        }
        // Le refus doit venir de la clause WITH CHECK de la policy, pas
        // d'une vérification applicative.
        expect({ table, rejected }).toEqual({ table, rejected: true });
        expect({ table, isRls: /row-level security|violates row-level/i.test(message) }).toEqual({
          table,
          isRls: true,
        });
        await cleanupRows(admin, table, [foreignId]);
      }

      // --- 4. Mise à jour croisée : sans effet --------------------------
      const updated = await asOrganization(app, orgA, (tx) =>
        tx.$executeRawUnsafe(`UPDATE "${table}" SET updated_at = now() WHERE id = $1::uuid`, idB),
      ).catch(() => 0);
      expect({ table, updated }).toEqual({ table, updated: 0 });

      covered.push(table);
      await cleanupRows(admin, table, [idA, idB]);
    }

    // Compte rendu lisible dans la sortie de test.
    console.info(`\n[RLS] Tables couvertes (${covered.length}) : ${covered.join(', ')}`);
    if (skipped.length > 0) {
      console.info(`[RLS] Tables sautées (${skipped.length}) :`);
      for (const { table, reason } of skipped) {
        console.info(`  - ${table} : ${reason}`);
      }
    }

    expect(covered.length).toBeGreaterThan(0);
  }, 300_000);

  it('couvre obligatoirement les tables de la phase 0 portant organization_id', () => {
    const missing = PHASE0_TENANT_TABLES.filter(
      (t) => t !== 'organizations' && !covered.includes(t),
    );
    expect({ missing, covered }).toEqual({ missing: [], covered: expect.any(Array) });
  });

  it('vérifie que les tables d’authentification sont bien GLOBALES et hors RLS', async () => {
    for (const table of PHASE0_GLOBAL_TABLES) {
      const columns = await admin.$queryRawUnsafe<Array<{ column_name: string }>>(
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'organization_id'`,
        table,
      );
      // Aucune colonne organization_id : l'isolation y serait un contresens
      // (un utilisateur appartient à plusieurs organisations).
      expect({ table, columns }).toEqual({ table, columns: [] });

      const [rls] = await admin.$queryRawUnsafe<Array<{ relrowsecurity: boolean }>>(
        `SELECT relrowsecurity FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relname = $1`,
        table,
      );
      expect({ table, rls: rls.relrowsecurity }).toEqual({ table, rls: false });

      // Le rôle applicatif doit néanmoins pouvoir les lire : l'autorisation
      // est assurée par le JWT et `organization_members`.
      const readable = await app.$queryRawUnsafe<Array<unknown>>(
        `SELECT 1 FROM "${table}" LIMIT 1`,
      );
      expect(Array.isArray(readable)).toBe(true);
    }
  });

  it('laisse passer les drapeaux globaux mais interdit de les modifier', async () => {
    const globalKey = `rls.global.${Math.random().toString(36).slice(2, 8)}`;
    await admin.$executeRawUnsafe(
      `INSERT INTO feature_flags (id, organization_id, key, is_enabled) VALUES ($1::uuid, NULL, $2, true)`,
      uuidv7(),
      globalKey,
    );

    try {
      // `feature_flags.organization_id` est NULLABLE : la policy autorise
      // la lecture des lignes globales par tous les tenants.
      const fromA = await asOrganization(app, orgA, (tx) =>
        tx.$queryRawUnsafe<Array<{ key: string }>>(
          `SELECT key FROM feature_flags WHERE key = $1`,
          globalKey,
        ),
      );
      expect(fromA).toHaveLength(1);

      // Mais une policy RESTRICTIVE interdit d'y toucher.
      const updated = await asOrganization(app, orgA, (tx) =>
        tx.$executeRawUnsafe(
          `UPDATE feature_flags SET is_enabled = false WHERE key = $1`,
          globalKey,
        ),
      );
      expect(updated).toBe(0);

      const deleted = await asOrganization(app, orgA, (tx) =>
        tx.$executeRawUnsafe(`DELETE FROM feature_flags WHERE key = $1`, globalKey),
      );
      expect(deleted).toBe(0);
    } finally {
      await admin.$executeRawUnsafe(`DELETE FROM feature_flags WHERE key = $1`, globalKey);
    }
  });
});

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

/**
 * `slot` choisit l'utilisateur de réserve : 1 pour la ligne de balayage,
 * 2 pour la tentative d'écriture croisée.
 */
function anchorsFor(fixture: Fixture, slot: 1 | 2 = 1): Anchors {
  return {
    organizationId: fixture.organizationId,
    userId: fixture.userIds[slot],
    known: fixture.anchors,
  };
}

/** Exécute un travail sous le contexte RLS d'une organisation. */
async function asOrganization<T>(
  client: PrismaClient,
  fixture: Fixture,
  work: (tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]) => Promise<T>,
): Promise<T> {
  return client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_organization_id', $1, true)`,
      fixture.organizationId,
    );
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_user_id', $1, true)`,
      fixture.userIds[0],
    );
    return work(tx);
  });
}

async function insertAs(
  client: PrismaClient,
  fixture: Fixture,
  table: string,
  values: Record<string, unknown>,
): Promise<void> {
  const { sql, params } = buildInsert(table, values);
  await asOrganization(client, fixture, (tx) => tx.$executeRawUnsafe(sql, ...params));
}

/**
 * Crée une organisation complète : trois utilisateurs et une chaîne de
 * lignes métier (bailleur → immeuble → lot, plus un locataire) servant de
 * cibles aux clés étrangères obligatoires. Sans ces ancres, toutes les
 * tables du patrimoine et de la facturation seraient sautées faute de
 * pouvoir satisfaire un `landlord_id` ou un `unit_id`.
 */
async function createFixture(admin: PrismaClient, label: string): Promise<Fixture> {
  const organizationId = uuidv7();
  const userIds: [string, string, string] = [uuidv7(), uuidv7(), uuidv7()];
  const suffix = Math.random().toString(36).slice(2, 8);
  const slug = `rls-${label.toLowerCase()}-${suffix}`;
  const basePhone = Math.floor(Math.random() * 9_000_000) + 1_000_000;
  const phone = (offset: number): string => `+2420${basePhone}${offset}`;

  await admin.$executeRawUnsafe(
    `INSERT INTO organizations (id, type, legal_name, slug, contact_phone, city)
     VALUES ($1::uuid, 'AGENCY', $2, $3, $4, 'Brazzaville')`,
    organizationId,
    `Organisation RLS ${label}`,
    slug,
    phone(0),
  );

  for (const [index, userId] of userIds.entries()) {
    await admin.$executeRawUnsafe(
      `INSERT INTO users (id, phone_e164, status) VALUES ($1::uuid, $2, 'ACTIVE')`,
      userId,
      phone(index),
    );
  }

  await admin.$executeRawUnsafe(
    `INSERT INTO organization_members (id, organization_id, user_id, role)
     VALUES ($1::uuid, $2::uuid, $3::uuid, 'OWNER')`,
    uuidv7(),
    organizationId,
    userIds[0],
  );

  const anchors = new Map<string, string>();
  const landlordId = uuidv7();
  const tenantId = uuidv7();
  const propertyId = uuidv7();
  const unitId = uuidv7();

  await admin.$executeRawUnsafe(
    `INSERT INTO landlords (id, organization_id, last_name, primary_phone)
     VALUES ($1::uuid, $2::uuid, $3, $4)`,
    landlordId,
    organizationId,
    `Bailleur ${label}`,
    phone(4),
  );
  await admin.$executeRawUnsafe(
    `INSERT INTO tenants (id, organization_id, last_name, primary_phone)
     VALUES ($1::uuid, $2::uuid, $3, $4)`,
    tenantId,
    organizationId,
    `Locataire ${label}`,
    phone(5),
  );
  await admin.$executeRawUnsafe(
    `INSERT INTO properties (id, organization_id, landlord_id, name, address_line, district)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6)`,
    propertyId,
    organizationId,
    landlordId,
    `Immeuble ${label}`,
    '1, rue de test',
    'Mpila',
  );
  await admin.$executeRawUnsafe(
    `INSERT INTO units (id, organization_id, property_id, code) VALUES ($1::uuid, $2::uuid, $3::uuid, $4)`,
    unitId,
    organizationId,
    propertyId,
    `A-${label}`,
  );

  anchors.set('landlords', landlordId);
  anchors.set('tenants', tenantId);
  anchors.set('properties', propertyId);
  anchors.set('units', unitId);

  return { organizationId, userIds, anchors, slug };
}

async function dropFixture(admin: PrismaClient, fixture: Fixture): Promise<void> {
  // ON DELETE CASCADE nettoie l'ensemble des lignes rattachées ; les
  // déclencheurs append-only d'`audit_logs` sont neutralisés le temps du
  // nettoyage (artifice réservé aux tests).
  await withAuditTriggersDisabled(admin, async () => {
    await admin
      .$executeRawUnsafe(`DELETE FROM organizations WHERE id = $1::uuid`, fixture.organizationId)
      .catch(() => undefined);
    for (const userId of fixture.userIds) {
      await admin
        .$executeRawUnsafe(`DELETE FROM users WHERE id = $1::uuid`, userId)
        .catch(() => undefined);
    }
  });
}

/**
 * Supprime les lignes de balayage. Les tables append-only (`audit_logs`,
 * `payment_allocations`) refusent le DELETE : leurs déclencheurs sont
 * neutralisés le temps du nettoyage, artifice réservé aux tests.
 */
async function cleanupRows(admin: PrismaClient, table: string, ids: string[]): Promise<void> {
  const remove = async () => {
    for (const id of ids) {
      await admin
        .$executeRawUnsafe(`DELETE FROM "${table}" WHERE id = $1::uuid`, id)
        .catch(() => undefined);
    }
  };
  if (table === 'audit_logs' || table === 'payment_allocations') {
    await admin.$executeRawUnsafe(`ALTER TABLE "${table}" DISABLE TRIGGER USER`);
    try {
      await remove();
    } finally {
      await admin.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE TRIGGER USER`);
    }
    return;
  }
  await remove();
}

function firstLine(error: unknown): string {
  return String((error as Error).message ?? error)
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .slice(-1)[0]
    ?.trim()
    .slice(0, 160);
}
