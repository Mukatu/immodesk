import type { CsvCell } from '../../reporting/domain/csv';

/**
 * Sérialisation CSV d'une valeur brute Postgres (`$queryRawUnsafe`) : BigInt,
 * Date et JSONB en texte, jamais un flottant approximatif — même garde que
 * les montants XAF ailleurs dans le dépôt. Partagé par `org-export.service.ts`
 * et `subject-export.service.ts`.
 */
export function sqlCellToCsv(value: unknown): CsvCell {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') return value.toString(10);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return value;
  return String(value);
}
