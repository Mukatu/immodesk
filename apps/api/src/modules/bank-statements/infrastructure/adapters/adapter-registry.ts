import type { BankStatementAdapter, ImplementedFormat } from '../../domain/canonical-statement';
import { createCsvAdapter } from './csv-adapter';
import { CSV_DESCRIPTORS } from './csv-descriptors';
import { MT940_ADAPTER } from './mt940-adapter';

/**
 * Registre ordonné des adaptateurs livrés en phase 6, lot 1 : BGFI, LCB,
 * Ecobank, UBA (CSV déclaratifs) puis MT940. L'ordre importe pour la
 * détection automatique — le premier `detect()` qui répond vrai l'emporte.
 */
export const ADAPTERS: readonly BankStatementAdapter[] = [
  ...CSV_DESCRIPTORS.map((descriptor) => createCsvAdapter(descriptor)),
  MT940_ADAPTER,
];

export function adapterByCode(code: string): BankStatementAdapter | null {
  return ADAPTERS.find((a) => a.code === code) ?? null;
}

function adaptersForFormat(format: ImplementedFormat): readonly BankStatementAdapter[] {
  return ADAPTERS.filter((a) => a.format === format);
}

/**
 * Détecte l'adaptateur applicable. Si `format` est imposé, seuls les
 * adaptateurs de ce format sont interrogés (`detect()`) ; sinon tout le
 * registre est parcouru dans l'ordre, le premier `detect() === true`
 * l'emporte. Retourne `null` si aucun ne reconnaît le fichier.
 */
export function detectAdapter(
  file: Buffer,
  format?: ImplementedFormat,
): BankStatementAdapter | null {
  const candidates = format ? adaptersForFormat(format) : ADAPTERS;
  for (const adapter of candidates) {
    if (adapter.detect(file)) return adapter;
  }
  return null;
}
