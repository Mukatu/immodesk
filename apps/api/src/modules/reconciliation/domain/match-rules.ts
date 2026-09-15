import { dayDifference } from './scoring';

/**
 * Règle EXACT (docs/api/phase6-contract.md, § « Moteur de rapprochement »,
 * tableau des niveaux) : référence structurée trouvée (libellé OU référence
 * de bout en bout), montant identique au franc près, date d'opération dans
 * la fenêtre `dateWindowDays` autour de la date de la cible.
 */
export interface ExactMatchInput {
  hasStructuredReference: boolean;
  lineAmount: bigint;
  targetAmount: bigint;
  lineDate: Date;
  targetDate: Date;
  dateWindowDays: number;
}

export function isExactMatch(input: ExactMatchInput): boolean {
  if (!input.hasStructuredReference) return false;
  if (input.lineAmount !== input.targetAmount) return false;
  const diffDays = Math.abs(dayDifference(input.lineDate, input.targetDate));
  return diffDays <= input.dateWindowDays;
}

/**
 * Statut de naissance d'un rapprochement EXACT : `CONFIRMED` immédiat si le
 * réglage `autoConfirmExact` est actif, `PROPOSED` sinon — dans tous les cas
 * `confidence_score 100` (contrat, § « Exact » : « autrement la
 * correspondance naît SUGGESTED/PROPOSED avec le score 100 »).
 */
export function exactMatchStatus(autoConfirmExact: boolean): 'CONFIRMED' | 'PROPOSED' {
  return autoConfirmExact ? 'CONFIRMED' : 'PROPOSED';
}
