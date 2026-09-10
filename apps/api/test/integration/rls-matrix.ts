import type { PrismaClient } from '@prisma/client';

/** Description d'une colonne telle que lue dans information_schema. */
export interface ColumnInfo {
  name: string;
  dataType: string;
  udtName: string;
  isNullable: boolean;
  hasDefault: boolean;
  maxLength: number | null;
  isIdentity: boolean;
}

export interface ForeignKeyInfo {
  column: string;
  targetTable: string;
  targetColumn: string;
}

/** Valeurs prêtes pour un INSERT minimal, ou la raison d'un saut. */
export type RowPlan =
  | { kind: 'ready'; values: Record<string, unknown> }
  | { kind: 'skipped'; reason: string };

/** Contexte d'ancrage : identifiants déjà créés, réutilisables comme cibles de FK. */
export interface Anchors {
  /** Identifiant de l'organisation cible. */
  organizationId: string;
  /** Utilisateur global existant. */
  userId: string;
  /** Table -> identifiant d'une ligne existante de cette organisation. */
  known: Map<string, string>;
}

/**
 * Valeurs supplémentaires pour les tables dont une contrainte CHECK ne peut
 * pas être satisfaite par un générateur générique (« au moins un de ces deux
 * champs », « ce champ doit être un numéro E.164 », ...).
 *
 * Chaque entrée est un choix explicite et documenté : sans elles, ces tables
 * seraient sautées, et l'isolation de `invitations` — table de la phase 0 —
 * ne serait pas démontrée.
 */
export const TABLE_HINTS: Record<string, Record<string, unknown>> = {
  // invitations_target_chk : téléphone OU e-mail obligatoire.
  invitations: { phone_e164: '+242066000099' },
  // landlords_name_chk / landlords_phone_chk.
  landlords: { last_name: 'Bailleur RLS', primary_phone: '+242066000098' },
  // tenants_name_chk / tenants_phone_chk.
  tenants: { last_name: 'Locataire RLS', primary_phone: '+242066000097' },
  // guarantors_name_chk / guarantors_phone_chk.
  guarantors: { last_name: 'Garant RLS', primary_phone: '+242066000096' },
};

/**
 * Toutes les tables portant `organization_id`, hors programme d'apport
 * d'affaires (`referral%`), qui est global et cloisonné par partenaire et
 * non par tenant (voir docs/schema/schema.sql, partie 13).
 */
export async function listTenantTables(admin: PrismaClient): Promise<string[]> {
  const rows = await admin.$queryRawUnsafe<Array<{ table_name: string }>>(`
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'organization_id'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name NOT LIKE 'referral%'
    ORDER BY c.table_name
  `);
  return rows.map((r) => r.table_name);
}

export async function describeColumns(
  admin: PrismaClient,
  table: string,
): Promise<ColumnInfo[]> {
  const rows = await admin.$queryRawUnsafe<
    Array<{
      column_name: string;
      data_type: string;
      udt_name: string;
      is_nullable: string;
      column_default: string | null;
      character_maximum_length: number | null;
      is_identity: string;
    }>
  >(
    `SELECT column_name, data_type, udt_name, is_nullable, column_default,
            character_maximum_length, is_identity
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position`,
    table,
  );
  return rows.map((r) => ({
    name: r.column_name,
    dataType: r.data_type,
    udtName: r.udt_name,
    isNullable: r.is_nullable === 'YES',
    hasDefault: r.column_default !== null,
    maxLength: r.character_maximum_length,
    isIdentity: r.is_identity === 'YES',
  }));
}

export async function describeForeignKeys(
  admin: PrismaClient,
  table: string,
): Promise<ForeignKeyInfo[]> {
  const rows = await admin.$queryRawUnsafe<
    Array<{ column_name: string; target_table: string; target_column: string }>
  >(
    `SELECT kcu.column_name,
            ccu.table_name  AS target_table,
            ccu.column_name AS target_column
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON kcu.constraint_name = tc.constraint_name
        AND kcu.table_schema = tc.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = $1`,
    table,
  );
  return rows.map((r) => ({
    column: r.column_name,
    targetTable: r.target_table,
    targetColumn: r.target_column,
  }));
}

/** Étiquettes d'un type énuméré PostgreSQL. */
export async function enumLabels(admin: PrismaClient, udtName: string): Promise<string[]> {
  const rows = await admin.$queryRawUnsafe<Array<{ label: string }>>(
    `SELECT e.enumlabel AS label
       FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = $1
      ORDER BY e.enumsortorder`,
    udtName,
  );
  return rows.map((r) => r.label);
}

/**
 * Construit un INSERT minimal générique : uniquement la clé primaire, la
 * colonne `organization_id` et les colonnes NOT NULL sans valeur par défaut.
 *
 * Toute colonne obligatoire que l'on ne sait pas satisfaire génériquement
 * (clé étrangère vers une table non ancrée) fait sauter la table proprement,
 * avec une raison explicite. Une table sautée n'est PAS un échec de la RLS :
 * c'est une limite du générateur de données, signalée telle quelle.
 */
export async function planMinimalRow(
  admin: PrismaClient,
  table: string,
  rowId: string,
  anchors: Anchors,
  enumCache: Map<string, string[]>,
): Promise<RowPlan> {
  const [columns, foreignKeys] = await Promise.all([
    describeColumns(admin, table),
    describeForeignKeys(admin, table),
  ]);
  const fkByColumn = new Map(foreignKeys.map((fk) => [fk.column, fk]));
  const values: Record<string, unknown> = {};

  for (const column of columns) {
    if (column.name === 'id') {
      values.id = typed(rowId, 'uuid');
      continue;
    }
    if (column.name === 'organization_id') {
      values.organization_id = typed(anchors.organizationId, 'uuid');
      continue;
    }
    // Colonne facultative ou pourvue d'une valeur par défaut : on la laisse.
    if (column.isNullable || column.hasDefault || column.isIdentity) continue;

    const fk = fkByColumn.get(column.name);
    if (fk) {
      if (fk.targetTable === 'organizations') {
        values[column.name] = typed(anchors.organizationId, 'uuid');
        continue;
      }
      if (fk.targetTable === 'users') {
        values[column.name] = typed(anchors.userId, 'uuid');
        continue;
      }
      const known = anchors.known.get(fk.targetTable);
      if (known) {
        values[column.name] = typed(known, 'uuid');
        continue;
      }
      return {
        kind: 'skipped',
        reason: `colonne obligatoire « ${column.name} » référence « ${fk.targetTable} », non ancrée génériquement`,
      };
    }

    const synthesized = await synthesize(admin, column, enumCache);
    if (synthesized === UNSUPPORTED) {
      return {
        kind: 'skipped',
        reason: `type non pris en charge pour la colonne obligatoire « ${column.name} » (${column.udtName})`,
      };
    }
    values[column.name] = synthesized;
  }

  for (const [column, value] of Object.entries(TABLE_HINTS[table] ?? {})) {
    values[column] = value;
  }

  return { kind: 'ready', values };
}

const UNSUPPORTED = Symbol('UNSUPPORTED');

async function synthesize(
  admin: PrismaClient,
  column: ColumnInfo,
  enumCache: Map<string, string[]>,
): Promise<unknown | typeof UNSUPPORTED> {
  const unique = Math.random().toString(36).slice(2, 10);

  if (column.dataType === 'USER-DEFINED') {
    let labels = enumCache.get(column.udtName);
    if (!labels) {
      labels = await enumLabels(admin, column.udtName);
      enumCache.set(column.udtName, labels);
    }
    return labels.length > 0 ? { raw: `'${labels[0]}'::${column.udtName}` } : UNSUPPORTED;
  }

  switch (column.udtName) {
    case 'text':
    case 'varchar':
      return column.maxLength && column.maxLength < unique.length
        ? unique.slice(0, column.maxLength)
        : `rls-${unique}`;
    case 'bpchar':
      // CHAR(2) = code pays, CHAR(3) = devise : contraints par CHECK.
      return column.maxLength === 2 ? 'CG' : 'XAF';
    case 'uuid':
      return { raw: 'gen_random_uuid()' };
    case 'int2':
    case 'int4':
      return { raw: '1' };
    case 'int8':
      return { raw: '0' };
    case 'numeric':
    case 'float4':
    case 'float8':
      return { raw: '0' };
    case 'bool':
      return { raw: 'false' };
    case 'timestamptz':
    case 'timestamp':
      return { raw: 'now()' };
    case 'date':
      return { raw: 'current_date' };
    case 'jsonb':
    case 'json':
      return { raw: `'{}'::${column.udtName}` };
    case 'inet':
      return { raw: `'127.0.0.1'::inet` };
    case 'bytea':
      return { raw: `'\\x00'::bytea` };
    default:
      if (column.dataType === 'ARRAY') return { raw: `'{}'::${column.udtName}` };
      return UNSUPPORTED;
  }
}

/**
 * Rend un INSERT paramétré.
 *
 * Les valeurs « raw » sont inlinées telles quelles ; les paramètres portent un
 * transtypage explicite (`$1::uuid`, `$2::int8`, ...). PostgreSQL reçoit les
 * paramètres de Prisma en `text` et refuserait sinon un UUID ou un entier
 * (`42804: column is of type uuid but expression is of type text`).
 */
export function buildInsert(
  table: string,
  values: Record<string, unknown>,
): { sql: string; params: unknown[] } {
  const columns: string[] = [];
  const placeholders: string[] = [];
  const params: unknown[] = [];

  for (const [column, value] of Object.entries(values)) {
    columns.push(`"${column}"`);
    if (isRaw(value)) {
      placeholders.push(value.raw);
    } else if (isTyped(value)) {
      params.push(value.param);
      placeholders.push(`$${params.length}::${value.cast}`);
    } else {
      params.push(value);
      placeholders.push(`$${params.length}`);
    }
  }

  return {
    sql: `INSERT INTO "${table}" (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
    params,
  };
}

export function typed(param: unknown, cast: string): { param: unknown; cast: string } {
  return { param, cast };
}

function isRaw(value: unknown): value is { raw: string } {
  return typeof value === 'object' && value !== null && 'raw' in value;
}

function isTyped(value: unknown): value is { param: unknown; cast: string } {
  return typeof value === 'object' && value !== null && 'cast' in value && 'param' in value;
}
