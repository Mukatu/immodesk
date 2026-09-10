/**
 * Script rejouable de génération des enums TypeScript à partir du schéma SQL.
 *
 * Lit `docs/schema/schema.sql` à la racine du monorepo, extrait toutes les
 * déclarations `CREATE TYPE <nom> AS ENUM (...)`, et génère
 * `src/enums/generated.ts` (+ `src/enums/index.ts`) dans ce package.
 *
 * Usage : `tsx scripts/gen-enums.ts` (depuis packages/shared) ou via le
 * script npm `pnpm --filter @immodesk/shared gen:enums`.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Résolution des chemins relative à ce script (indépendante du cwd).
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// packages/shared/scripts -> ../../../docs/schema/schema.sql = <racine repo>/docs/schema/schema.sql
const PRIMARY_SCHEMA_PATH = resolve(__dirname, '../../../docs/schema/schema.sql');
// Repli de robustesse si l'arborescence du repo diffère de ce qui est attendu.
const FALLBACK_SCHEMA_PATH = resolve(__dirname, '../../docs/schema/schema.sql');

function resolveSchemaPath(): string {
  if (existsSync(PRIMARY_SCHEMA_PATH)) {
    return PRIMARY_SCHEMA_PATH;
  }
  if (existsSync(FALLBACK_SCHEMA_PATH)) {
    console.warn(
      `[gen-enums] Chemin principal introuvable (${PRIMARY_SCHEMA_PATH}), utilisation du repli : ${FALLBACK_SCHEMA_PATH}`,
    );
    return FALLBACK_SCHEMA_PATH;
  }
  throw new Error(
    `[gen-enums] Impossible de localiser schema.sql. Essayé :\n  - ${PRIMARY_SCHEMA_PATH}\n  - ${FALLBACK_SCHEMA_PATH}`,
  );
}

/** Convertit un identifiant SQL snake_case en PascalCase. */
function toPascalCase(snakeCase: string): string {
  return snakeCase
    .split('_')
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join('');
}

interface ExtractedEnum {
  sqlName: string;
  pascalName: string;
  values: string[];
}

// Capture tout le contenu entre `CREATE TYPE <nom> AS ENUM (` et `);`.
// `[\s\S]*?` (au lieu de `.*?`) matche aussi les retours à la ligne,
// ce qui couvre nativement les déclarations multi-lignes (équivalent au flag `s`/dotAll).
const ENUM_BLOCK_REGEX = /CREATE TYPE\s+(\w+)\s+AS\s+ENUM\s*\(([\s\S]*?)\);/g;

function extractEnums(schemaSql: string): ExtractedEnum[] {
  const results: ExtractedEnum[] = [];
  const usedNames = new Map<string, number>();

  let match: RegExpExecArray | null;
  while ((match = ENUM_BLOCK_REGEX.exec(schemaSql)) !== null) {
    const sqlName = match[1];
    const rawBody = match[2];

    // Retire les commentaires SQL de fin de ligne `-- ...` à l'intérieur du bloc.
    const bodyWithoutComments = rawBody.replace(/--.*$/gm, '');

    // Extrait toutes les valeurs entre guillemets simples.
    const values: string[] = [];
    const valueRegex = /'([^']*)'/g;
    let valueMatch: RegExpExecArray | null;
    while ((valueMatch = valueRegex.exec(bodyWithoutComments)) !== null) {
      values.push(valueMatch[1]);
    }

    let pascalName = toPascalCase(sqlName);

    // Gestion défensive des collisions de noms PascalCase.
    if (usedNames.has(pascalName)) {
      const count = usedNames.get(pascalName)!;
      const newCount = count + 1;
      usedNames.set(pascalName, newCount);
      const original = pascalName;
      pascalName = `${pascalName}${newCount}`;
      console.warn(
        `[gen-enums] Collision de nom détectée : "${sqlName}" produit "${original}" qui existe déjà. Renommé en "${pascalName}".`,
      );
    } else {
      usedNames.set(pascalName, 1);
    }

    results.push({ sqlName, pascalName, values });
  }

  return results;
}

function generateFileContent(enums: ExtractedEnum[]): string {
  const header = `/**
 * Fichier généré automatiquement — NE PAS ÉDITER À LA MAIN.
 *
 * Source : docs/schema/schema.sql (déclarations \`CREATE TYPE ... AS ENUM\`).
 * Régénérer via : \`pnpm --filter @immodesk/shared gen:enums\`
 */
`;

  const blocks = enums.map(({ pascalName, values }) => {
    const valuesLiteral = values.map((v) => `'${v}'`).join(', ');
    return `export const ${pascalName} = [${valuesLiteral}] as const;\nexport type ${pascalName} = (typeof ${pascalName})[number];`;
  });

  return `${header}\n${blocks.join('\n\n')}\n`;
}

function generateIndexContent(): string {
  return `export * from './generated.js';\n`;
}

function main(): void {
  const schemaPath = resolveSchemaPath();
  const schemaSql = readFileSync(schemaPath, 'utf-8');

  const enums = extractEnums(schemaSql);

  if (enums.length === 0) {
    throw new Error('[gen-enums] Aucun enum extrait — vérifier le format de schema.sql.');
  }

  const enumsDir = resolve(__dirname, '../src/enums');
  mkdirSync(enumsDir, { recursive: true });

  const generatedPath = resolve(enumsDir, 'generated.ts');
  const indexPath = resolve(enumsDir, 'index.ts');

  writeFileSync(generatedPath, generateFileContent(enums), 'utf-8');
  writeFileSync(indexPath, generateIndexContent(), 'utf-8');

  console.log(`${enums.length} enums generated`);
}

main();
