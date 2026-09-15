import type { MatchTargetRef, MatchTargetType } from './match-target';

/**
 * Score de rapprochement (docs/api/phase6-contract.md, § « Moteur de
 * rapprochement », calcul du score). Domaine pur, testable sans base :
 * aucune dépendance à Prisma ni à l'extension `pg_trgm` (absente).
 */
export interface ScoreBreakdown {
  amount: number;
  date: number;
  label: number;
  declaration: number;
}

export interface ScoredCandidate {
  target: MatchTargetRef;
  score: number;
  criteria: Record<string, unknown>;
}

/**
 * Indice de Dice sur les bigrammes de caractères des deux libellés, DÉJÀ
 * normalisés par l'appelant (`normalizeLabel`, `bank-statements/domain/
 * label-normalization.ts`) : cette fonction ne connaît rien de la casse, des
 * accents ou des mentions bancaires, elle compare deux chaînes telles
 * quelles. Déterministe, sans dépendance externe, substitut à `pg_trgm`.
 *
 * Deux chaînes vides sont considérées identiques (1) ; une vide et une non
 * vide sont considérées totalement dissemblables (0).
 */
export function labelSimilarity(a: string, b: string): number {
  const bigramsOf = (value: string): string[] => {
    const compact = value.replace(/\s+/g, '');
    if (compact.length < 2) return [];
    const grams: string[] = [];
    for (let i = 0; i < compact.length - 1; i += 1) grams.push(compact.slice(i, i + 2));
    return grams;
  };
  const left = bigramsOf(a);
  const right = bigramsOf(b);
  if (left.length === 0 && right.length === 0) return a === b ? 1 : 0;
  if (left.length === 0 || right.length === 0) return 0;

  const remaining = new Map<string, number>();
  for (const gram of right) remaining.set(gram, (remaining.get(gram) ?? 0) + 1);
  let intersection = 0;
  for (const gram of left) {
    const count = remaining.get(gram) ?? 0;
    if (count > 0) {
      intersection += 1;
      remaining.set(gram, count - 1);
    }
  }
  return (2 * intersection) / (left.length + right.length);
}

function absDiff(a: bigint, b: bigint): bigint {
  return a > b ? a - b : b - a;
}

/** Écart en jours civils entre deux dates (peut être négatif). */
export function dayDifference(a: Date, b: Date): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY);
}

export interface ScoreCandidateInput {
  lineAmount: bigint;
  targetAmount: bigint;
  /** `reconciliation.amountTolerancePercent`, réglage d'organisation. */
  amountTolerancePercent: number;
  lineDate: Date;
  targetDate: Date;
  /** Libellé normalisé de la ligne (`bank_statement_lines.normalized_label`). */
  normalizedLineLabel: string;
  /** Nom de la cible, normalisé par le même `normalizeLabel`. */
  normalizedTargetLabel: string;
  targetType: MatchTargetType;
  /** Une déclaration de virement en attente porte le même montant que la ligne. */
  hasPendingDeclarationSameAmount: boolean;
}

/**
 * Calcule le détail du score (barème sur 100, plafonné dans `totalScore`).
 * Renvoie `null` quand l'écart de montant dépasse la tolérance : le candidat
 * est ALORS ÉCARTÉ, jamais noté avec un score bas (contrat, § calcul du
 * score : « au-delà 0 et le candidat est écarté »).
 */
export function scoreCandidate(input: ScoreCandidateInput): ScoreBreakdown | null {
  const diff = absDiff(input.lineAmount, input.targetAmount);
  let amount: number;
  if (diff === 0n) {
    amount = 50;
  } else {
    // Tolérance calculée sur le montant de la ligne : c'est la référence
    // connue avec certitude (le montant réellement crédité en banque),
    // cohérente avec la borne SQL de `candidate-repository.ts`.
    const toleranceFraction = Math.max(0, input.amountTolerancePercent) / 100;
    const toleranceAmount = BigInt(Math.floor(Number(input.lineAmount) * toleranceFraction));
    if (diff > toleranceAmount) return null;
    amount = 35;
  }

  const diffDays = Math.abs(dayDifference(input.lineDate, input.targetDate));
  const date = diffDays < 3 ? 20 : diffDays < 10 ? 10 : 0;

  const label = Math.round(
    labelSimilarity(input.normalizedLineLabel, input.normalizedTargetLabel) * 20,
  );

  // Le bonus « déclaration en attente de même montant » n'a de sens que si
  // la cible évaluée n'EST PAS elle-même cette déclaration : une déclaration
  // ne se bonifie pas de sa propre existence.
  const declaration =
    input.targetType !== 'DECLARATION' && input.hasPendingDeclarationSameAmount ? 10 : 0;

  return { amount, date, label, declaration };
}

/** Total plafonné à 100, quelle que soit la somme des critères. */
export function totalScore(breakdown: ScoreBreakdown): number {
  return Math.min(100, breakdown.amount + breakdown.date + breakdown.label + breakdown.declaration);
}
