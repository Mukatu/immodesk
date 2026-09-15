import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface ConfidenceScoreGaugeProps {
  /** Score de confiance d'une suggestion de rapprochement, entre 0 et 100. */
  score: number;
  className?: string;
}

function qualifier(score: number): string {
  if (score >= 90) return 'Confiance élevée';
  if (score >= 75) return 'Confiance correcte';
  return 'Confiance faible';
}

/**
 * Jauge de score de confiance (0-100) d'une suggestion de rapprochement
 * bancaire (contrat Phase 6, `MatchSuggestion.confidenceScore`). Le
 * qualificatif textuel est toujours affiché : la couleur n'est jamais le
 * seul porteur d'information.
 */
export function ConfidenceScoreGauge({ score, className }: ConfidenceScoreGaugeProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-2">
        <Progress value={clamped} className="flex-1" />
        <span className="text-sm font-medium tabular-nums">{clamped} %</span>
      </div>
      <p className="text-xs text-muted-foreground">{qualifier(clamped)}</p>
    </div>
  );
}
