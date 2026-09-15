import type { CanonicalStatement } from './canonical-statement';

export interface BalanceCheckResult {
  balanced: boolean;
  expected: number;
  actual: number;
  difference: number;
}

/**
 * Contrôle d'équilibre d'un relevé : `openingBalance + Σcrédits - Σdébits`
 * doit égaler `closingBalance`. Tout est fait en entiers XAF (le type
 * canonique garantit des `number` entiers), jamais en flottant.
 *
 * CONVENTION (documentée pour `BANK.STATEMENT_BALANCE_MISMATCH.details`) :
 * - `expected` est le solde de clôture CALCULÉ à partir des mouvements
 *   (`openingBalance + crédits - débits`) — ce que le relevé DEVRAIT annoncer.
 * - `actual` est le solde de clôture DÉCLARÉ par le fichier lui-même
 *   (`statement.closingBalance`).
 * - `difference = actual - expected` : positif si le relevé annonce un solde
 *   supérieur à ce que ses propres mouvements justifient.
 *
 * Fonction pure, sans accès base : testable isolément.
 */
export function checkBalance(statement: CanonicalStatement): BalanceCheckResult {
  let totalCredit = 0;
  let totalDebit = 0;
  for (const line of statement.lines) {
    if (line.direction === 'CREDIT') totalCredit += line.amount;
    else totalDebit += line.amount;
  }
  const expected = statement.openingBalance + totalCredit - totalDebit;
  const actual = statement.closingBalance;
  return { balanced: expected === actual, expected, actual, difference: actual - expected };
}
