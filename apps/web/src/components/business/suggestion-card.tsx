import type { MatchSuggestion } from '@/lib/api/types';
import { RECONCILIATION_TARGET_TYPE_LABELS } from '@/lib/enum-labels';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfidenceScoreGauge } from '@/components/business/confidence-score-gauge';
import { MoneyXaf } from '@/components/business/money-xaf';
import { cn } from '@/lib/utils';

export interface SuggestionCardProps {
  suggestion: MatchSuggestion;
  onConfirm?: () => void;
  onReject?: () => void;
  isConfirming?: boolean;
  isRejecting?: boolean;
  className?: string;
}

/**
 * Formate une date ISO en JJ/MM/AAAA sans dépendre de la locale de
 * l'environnement (toLocaleDateString('fr-CG') n'est pas garanti disponible
 * en Node de test).
 */
function formatDateFr(iso: string): string {
  const date = new Date(iso);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/** Transforme une clé camelCase simple en libellé lisible (ex. "dateDelta" -> "Date delta"). */
function humanizeKey(key: string): string {
  if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(key)) return key;
  const withSpaces = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  const lower = withSpaces.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function formatCriterionValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Carte d'une suggestion de rapprochement bancaire (contrat Phase 6,
 * `MatchSuggestion`) : cible visée, montant, date, locataire/facture
 * éventuels, score de confiance et détail des critères retenus, avec
 * actions de validation/rejet.
 */
export function SuggestionCard({
  suggestion,
  onConfirm,
  onReject,
  isConfirming = false,
  isRejecting = false,
  className,
}: SuggestionCardProps) {
  const criteriaEntries = Object.entries(suggestion.criteria);
  const busy = isConfirming || isRejecting;

  return (
    <Card className={cn(className)}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">{suggestion.label}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {RECONCILIATION_TARGET_TYPE_LABELS[suggestion.targetType]}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Montant</dt>
            <dd className="font-medium">
              <MoneyXaf amount={suggestion.amount} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Date</dt>
            <dd className="font-medium">{formatDateFr(suggestion.date)}</dd>
          </div>
          {suggestion.tenant ? (
            <div>
              <dt className="text-xs text-muted-foreground">Locataire</dt>
              <dd className="font-medium">{suggestion.tenant.displayName}</dd>
            </div>
          ) : null}
          {suggestion.invoice?.invoiceNumber ? (
            <div>
              <dt className="text-xs text-muted-foreground">Facture</dt>
              <dd className="font-medium">{suggestion.invoice.invoiceNumber}</dd>
            </div>
          ) : null}
        </dl>

        <ConfidenceScoreGauge score={suggestion.confidenceScore} />

        {criteriaEntries.length > 0 ? (
          <div>
            <h4 className="text-sm font-medium">Critères retenus</h4>
            <dl className="mt-1 space-y-1 text-sm">
              {criteriaEntries.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{humanizeKey(key)}</dt>
                  <dd className="font-medium">{formatCriterionValue(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {onConfirm || onReject ? (
          <div className="flex justify-end gap-2">
            {onReject ? (
              <Button type="button" variant="outline" onClick={onReject} disabled={busy}>
                {isRejecting ? 'Rejet…' : 'Rejeter'}
              </Button>
            ) : null}
            {onConfirm ? (
              <Button type="button" onClick={onConfirm} disabled={busy}>
                {isConfirming ? 'Validation…' : 'Valider'}
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
