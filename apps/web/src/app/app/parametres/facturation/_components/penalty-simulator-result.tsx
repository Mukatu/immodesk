import type { SimulatePenaltyResult } from '@/lib/api/types';

const CAPPED_BY_LABELS: Record<'capAmount' | 'capRateBps', string> = {
  capAmount: 'Plafond en montant',
  capRateBps: 'Plafond en pourcentage du solde',
};

export interface PenaltySimulatorResultProps {
  result: SimulatePenaltyResult;
  /** Montant déjà formaté (`MoneyXaf`), injecté par l'appelant pour rester un composant pur. */
  amount: React.ReactNode;
}

/**
 * Résultat pur d'une simulation de pénalité : montant, plafond éventuellement
 * appliqué (aucun des deux si le calcul n'a pas été plafonné) et nombre de
 * périodes retenues. Composant de présentation extrait pour être testé isolément.
 */
export function PenaltySimulatorResult({ result, amount }: PenaltySimulatorResultProps) {
  return (
    <dl
      className="grid gap-x-6 gap-y-2 rounded-md border border-border bg-muted/30 p-4 text-sm sm:grid-cols-3"
      aria-live="polite"
    >
      <div>
        <dt className="text-muted-foreground">Montant calculé</dt>
        <dd className="text-lg font-semibold">{amount}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Plafonné par</dt>
        <dd className="font-medium">
          {result.cappedBy ? CAPPED_BY_LABELS[result.cappedBy] : 'Aucun plafond atteint'}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Périodes retenues</dt>
        <dd className="font-medium">{result.periods}</dd>
      </div>
    </dl>
  );
}
