import { splitCsvLine } from '../../bank-statements/infrastructure/adapters/csv-adapter';

/**
 * Lecture et validation ligne à ligne du CSV d'import de portefeuille
 * (contrat phase 10, § « Import de portefeuille ») : UTF-8, séparateur
 * point-virgule, chaque ligne préfixée du type d'entité —
 * `BAILLEUR;BIEN;LOT;LOCATAIRE;BAIL`, dans cet ordre, les dépendances
 * croisées se résolvant par des références LOCALES au fichier (première
 * colonne de chaque ligne, sauf `BAIL`).
 *
 * Domaine pur : aucune dépendance Prisma ni Nest. `splitCsvLine` est
 * réutilisée telle quelle depuis `bank-statements` (même règle de
 * découpage : guillemets doublés, RFC 4180) plutôt que réécrite ici.
 */
export const ENTITY_TAGS = ['BAILLEUR', 'BIEN', 'LOT', 'LOCATAIRE', 'BAIL'] as const;
export type EntityTag = (typeof ENTITY_TAGS)[number];

export interface RawImportRow {
  /** Numéro de ligne dans le fichier (1-based), pour le rapport. */
  line: number;
  type: string;
  /** Colonnes après le type. */
  fields: string[];
}

/** Découpe le fichier en lignes non vides, numérotées par leur position réelle. */
export function parseImportRows(buffer: Buffer): RawImportRow[] {
  const text = buffer.toString('utf8');
  const lines = text.split(/\r\n|\r|\n/);
  const rows: RawImportRow[] = [];
  lines.forEach((raw, index) => {
    if (raw.trim() === '') return;
    const cells = splitCsvLine(raw, ';');
    rows.push({
      line: index + 1,
      type: (cells[0] ?? '').trim().toUpperCase(),
      fields: cells.slice(1),
    });
  });
  return rows;
}

/** Ligne rejetée : capturée par le service, jamais laissée remonter telle quelle. */
export class RowRejected extends Error {}

function field(fields: string[], index: number, name: string): string {
  const value = (fields[index] ?? '').trim();
  if (!value) throw new RowRejected(`Colonne « ${name} » manquante.`);
  return value;
}

function optionalField(fields: string[], index: number): string | undefined {
  const value = (fields[index] ?? '').trim();
  return value === '' ? undefined : value;
}

function parseAmountField(raw: string, name: string): number {
  const n = Number(raw.replace(/\s/g, ''));
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    throw new RowRejected(`Colonne « ${name} » : montant entier attendu, reçu « ${raw} ».`);
  }
  return n;
}

function parseIntField(raw: string, name: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) {
    throw new RowRejected(`Colonne « ${name} » : entier attendu, reçu « ${raw} ».`);
  }
  return n;
}

export interface ParsedLandlordRow {
  localRef: string;
  input: {
    partyType: 'INDIVIDUAL' | 'COMPANY';
    lastName?: string;
    firstName?: string;
    companyName?: string;
    primaryPhone?: string;
  };
}

/** `BAILLEUR;localRef;lastName;firstName;companyName;primaryPhone` */
export function buildLandlordRow(fields: string[]): ParsedLandlordRow {
  const lastName = optionalField(fields, 1);
  const firstName = optionalField(fields, 2);
  const companyName = optionalField(fields, 3);
  const primaryPhone = optionalField(fields, 4);
  return {
    localRef: field(fields, 0, 'référence locale'),
    input: {
      partyType: companyName ? 'COMPANY' : 'INDIVIDUAL',
      lastName,
      firstName,
      companyName,
      primaryPhone,
    },
  };
}

export interface ParsedPropertyRow {
  localRef: string;
  landlordRef: string;
  input: { name: string; addressLine: string; district: string; city?: string };
}

/** `BIEN;localRef;landlordRef;name;addressLine;district;city?` */
export function buildPropertyRow(fields: string[]): ParsedPropertyRow {
  return {
    localRef: field(fields, 0, 'référence locale'),
    landlordRef: field(fields, 1, 'référence du bailleur'),
    input: {
      name: field(fields, 2, 'nom'),
      addressLine: field(fields, 3, 'adresse'),
      district: field(fields, 4, 'quartier'),
      city: optionalField(fields, 5),
    },
  };
}

export interface ParsedUnitRow {
  localRef: string;
  propertyRef: string;
  input: { code: string; baseRentAmount?: number; depositMonths?: number };
}

/** `LOT;localRef;propertyRef;code;baseRentAmount?;depositMonths?` */
export function buildUnitRow(fields: string[]): ParsedUnitRow {
  const baseRentRaw = optionalField(fields, 3);
  const depositRaw = optionalField(fields, 4);
  return {
    localRef: field(fields, 0, 'référence locale'),
    propertyRef: field(fields, 1, 'référence du bien'),
    input: {
      code: field(fields, 2, 'code'),
      baseRentAmount:
        baseRentRaw !== undefined ? parseAmountField(baseRentRaw, 'loyer de base') : undefined,
      depositMonths:
        depositRaw !== undefined ? parseIntField(depositRaw, 'mois de caution') : undefined,
    },
  };
}

export interface ParsedTenantRow {
  localRef: string;
  input: { partyType: 'INDIVIDUAL'; lastName?: string; firstName?: string; primaryPhone: string };
}

/** `LOCATAIRE;localRef;lastName;firstName;primaryPhone` */
export function buildTenantRow(fields: string[]): ParsedTenantRow {
  return {
    localRef: field(fields, 0, 'référence locale'),
    input: {
      partyType: 'INDIVIDUAL',
      lastName: optionalField(fields, 1),
      firstName: optionalField(fields, 2),
      primaryPhone: field(fields, 3, 'téléphone'),
    },
  };
}

export interface ParsedLeaseRow {
  unitRef: string;
  tenantRef: string;
  input: { startDate: string; rentAmount: number };
}

/** `BAIL;unitRef;tenantRef;startDate;rentAmount` */
export function buildLeaseRow(fields: string[]): ParsedLeaseRow {
  return {
    unitRef: field(fields, 0, 'référence du lot'),
    tenantRef: field(fields, 1, 'référence du locataire'),
    input: {
      startDate: field(fields, 2, 'date de début'),
      rentAmount: parseAmountField(field(fields, 3, 'loyer'), 'loyer'),
    },
  };
}
