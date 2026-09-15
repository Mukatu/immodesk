/**
 * État dérivé d'une ligne de relevé (docs/api/phase6-contract.md, § « Une
 * ligne de relevé n'a pas de colonne de statut »).
 *
 * ORDRE DE PRIORITÉ NORMATIF, à respecter à la lettre : une ligne ignorée
 * l'est quel que soit son montant rapproché, une ligne rapprochée en totalité
 * prime sur une simple suggestion, etc.
 */
export const LINE_STATES = [
  'UNMATCHED',
  'SUGGESTED',
  'PARTIALLY_MATCHED',
  'MATCHED',
  'IGNORED',
] as const;
export type LineState = (typeof LINE_STATES)[number];

export interface LineStateInput {
  isIgnored: boolean;
  isMatched: boolean;
  amount: bigint;
  matchedAmount: bigint;
  proposedCount: number;
}

export function computeLineState(input: LineStateInput): LineState {
  if (input.isIgnored) return 'IGNORED';
  if (input.isMatched) return 'MATCHED';
  if (input.matchedAmount > 0n && input.matchedAmount < input.amount) return 'PARTIALLY_MATCHED';
  if (input.proposedCount > 0) return 'SUGGESTED';
  return 'UNMATCHED';
}

/**
 * Prédicats SQL du filtre `?state=`, POUSSÉS EN BASE (jamais post-traités :
 * la pagination est par keyset). `p.proposed_count` vient d'un
 * `LEFT JOIN LATERAL` sur `reconciliation_matches` — voir
 * `STATEMENT_LINE_FROM` dans `application/statement-views.ts`.
 */
export const LINE_STATE_SQL_PREDICATES: Readonly<Record<LineState, string>> = {
  IGNORED: 'l.is_ignored',
  MATCHED: 'NOT l.is_ignored AND l.is_matched',
  PARTIALLY_MATCHED:
    'NOT l.is_ignored AND NOT l.is_matched AND l.matched_amount > 0 AND l.matched_amount < l.amount',
  SUGGESTED:
    'NOT l.is_ignored AND NOT l.is_matched ' +
    'AND NOT (l.matched_amount > 0 AND l.matched_amount < l.amount) AND p.proposed_count > 0',
  UNMATCHED:
    'NOT l.is_ignored AND NOT l.is_matched AND l.matched_amount = 0 AND p.proposed_count = 0',
};
