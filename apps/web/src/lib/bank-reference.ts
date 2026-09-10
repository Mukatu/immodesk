/**
 * Référentiel des banques et opérateurs Mobile Money opérant au Congo-Brazzaville,
 * utilisé pour résoudre un `bankCode` (BankAccount) en nom lisible fr-CG.
 */

export const BANK_REFERENCE: Array<{ code: string; name: string }> = [
  { code: 'BGFI', name: 'BGFIBank Congo' },
  { code: 'LCB', name: 'LCB Bank' },
  { code: 'ECOBANK', name: 'Ecobank Congo' },
  { code: 'UBA', name: 'UBA Congo' },
  { code: 'BSCA', name: 'BSCA Bank' },
  { code: 'CDCO', name: 'Crédit du Congo' },
  { code: 'SGC', name: 'Société Générale Congo' },
  { code: 'BCI', name: 'Banque Commerciale Internationale' },
  { code: 'MTN_MOMO', name: 'MTN Mobile Money' },
  { code: 'AIRTEL_MONEY', name: 'Airtel Money' },
];

/** Résout un code banque/opérateur vers son nom lisible ; retombe sur le code brut si inconnu. */
export function bankNameForCode(code: string): string {
  return BANK_REFERENCE.find((entry) => entry.code === code)?.name ?? code;
}
