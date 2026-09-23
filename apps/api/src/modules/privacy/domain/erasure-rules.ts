import type { PartyAnonymizationRow, PartyTable } from './subject';

/**
 * Règles d'anonymisation champ par champ (contrat phase 11, § « Effacement »,
 * tableau lignes 100-119, et arbitrages 7, 8, 9). Domaine PUR : aucune
 * dépendance Nest ni Prisma, pour rester testable sans base de données — la
 * logique la plus délicate du module, celle qu'une erreur rend irrécupérable.
 *
 * Vérifié colonne par colonne contre `docs/schema/schema.sql` (arbitrage du
 * contrat, ligne 98) : `landlords` ne porte ni `birth_place`, ni
 * `whatsapp_phone`, ni `profession`, ni `employer_name`, ni `monthly_income`,
 * ni `emergency_contact_*`, ni `client_ref` ; `guarantors` ne porte ni
 * `user_id`, ni `secondary_phone`, ni `whatsapp_phone`, ni `birth_date`, ni
 * `birth_place`, ni `nationality`, ni `id_document_expiry`, ni `rccm_number`,
 * ni `niu_number`, ni `emergency_contact_*`, ni `client_ref`.
 */

export interface ReservedValues {
  /** `PRIVACY_ANONYMIZED_NAME` (config), ex. « Tiers anonymisé ». */
  name: string;
  /** `PRIVACY_ANONYMIZED_PHONE` (config), ex. `+242000000000`. */
  phone: string;
}

/** Patch prêt pour `tx.<table>.update({ data: patch })` (clés `snake_case`). */
export type AnonymizationPatch = Record<string, string | null>;

export interface AnonymizationResult {
  /** `true` si la ligne portait déjà les valeurs réservées : rien à écrire (idempotence, contrat § Effacement). */
  alreadyAnonymized: boolean;
  patch: AnonymizationPatch;
  /** Noms de champs touchés, en `camelCase`, pour `ErasurePreview.anonymized[].fields`. */
  fields: string[];
}

/** Colonnes mises à `NULL` sur les trois tables de tiers (tableau, lignes 104-105). */
const NULL_COMMON = [
  'email',
  'address_line',
  'district',
  'notes',
  'id_document_type',
  'id_document_number',
  'id_document_id',
] as const;

/** `tenants`, `landlords` seuls (colonnes absentes de `guarantors`). */
const NULL_TENANT_LANDLORD = [
  'secondary_phone',
  'birth_date',
  'nationality',
  'id_document_expiry',
  'rccm_number',
  'niu_number',
] as const;

/** `tenants` seul (colonnes absentes de `landlords` et `guarantors`). */
const NULL_TENANT_ONLY = [
  'whatsapp_phone',
  'birth_place',
  'emergency_contact_name',
  'emergency_contact_phone',
  'client_ref',
] as const;

/** `tenants`, `guarantors` seuls (colonnes absentes de `landlords`). */
const NULL_TENANT_GUARANTOR = ['profession', 'employer_name', 'monthly_income'] as const;

/** `guarantors` seul. */
const NULL_GUARANTOR_ONLY = ['relationship'] as const;

function nullColumnsFor(table: PartyTable): readonly string[] {
  switch (table) {
    case 'tenants':
      return [
        ...NULL_COMMON,
        ...NULL_TENANT_LANDLORD,
        ...NULL_TENANT_ONLY,
        ...NULL_TENANT_GUARANTOR,
      ];
    case 'landlords':
      return [...NULL_COMMON, ...NULL_TENANT_LANDLORD];
    case 'guarantors':
      return [...NULL_COMMON, ...NULL_TENANT_GUARANTOR, ...NULL_GUARANTOR_ONLY];
  }
}

/** `user_id` : NULLée sur `tenants`/`landlords` (arbitrage 9) ; absente de `guarantors`. */
function userIdColumnFor(table: PartyTable): readonly string[] {
  return table === 'guarantors' ? [] : ['user_id'];
}

/** `snake_case` → `camelCase`, pour l'affichage contractuel des champs touchés. */
export function toCamel(column: string): string {
  return column.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
}

/**
 * Vrai si la ligne porte déjà les valeurs réservées de l'anonymisation.
 * Le téléphone réservé suffit : il est partagé et non routable, jamais
 * attribué autrement (arbitrage 8) — un `primary_phone` déjà égal à la
 * valeur réservée signe un tiers déjà traité.
 */
export function isAlreadyAnonymized(row: PartyAnonymizationRow, reserved: ReservedValues): boolean {
  return row.primary_phone === reserved.phone;
}

/**
 * Construit le correctif d'anonymisation d'un tiers, table par table.
 *
 * Nom réservé : sur `last_name` si `party_type = 'INDIVIDUAL'` (et
 * `company_name` mis à `NULL`), sur `company_name` si `'COMPANY'` (et
 * `last_name` mis à `NULL`) — les contraintes `*_name_chk` interdisent de
 * vider les deux à la fois. `first_name` est toujours mis à `NULL`, dans les
 * deux cas (tableau, ligne 104 : « l'autre champ de nom » désigne le champ de
 * nom NON réservé, `first_name` étant nullé indépendamment de ce choix).
 * `gender` est réécrit à `'UNSPECIFIED'`, jamais `NULL` (colonne `NOT NULL`).
 */
export function buildAnonymizationPatch(
  table: PartyTable,
  row: PartyAnonymizationRow,
  reserved: ReservedValues,
): AnonymizationResult {
  if (isAlreadyAnonymized(row, reserved)) {
    return { alreadyAnonymized: true, patch: {}, fields: [] };
  }

  const patch: AnonymizationPatch = {};

  if (row.party_type === 'COMPANY') {
    patch.company_name = reserved.name;
    patch.last_name = null;
  } else {
    patch.last_name = reserved.name;
    patch.company_name = null;
  }
  patch.first_name = null;
  patch.primary_phone = reserved.phone;
  patch.gender = 'UNSPECIFIED';

  for (const column of nullColumnsFor(table)) patch[column] = null;
  for (const column of userIdColumnFor(table)) patch[column] = null;

  return { alreadyAnonymized: false, patch, fields: Object.keys(patch).map(toCamel) };
}
