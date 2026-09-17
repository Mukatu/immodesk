import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { UtilityRunErrorEntry, UtilityRunSkippedEntry } from '@/lib/api/types';

export interface UtilityRunReportProps {
  created: number;
  skipped: UtilityRunSkippedEntry[];
  errors: UtilityRunErrorEntry[];
}

/**
 * Rapport de campagne de refacturation des charges, en trois parties
 * clairement séparées : lignes créées, lots ignorés (avec motif), erreurs.
 * `created` est un compte (le contrat ne renvoie pas le détail des lignes
 * créées, seulement leur nombre) : aucun montant à agréger côté client.
 */
export function UtilityRunReport({ created, skipped, errors }: UtilityRunReportProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
            Lignes de charge créées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{created}</p>
          <p className="text-sm text-muted-foreground">
            {created > 1
              ? 'lignes WATER_CHARGE ou ELECTRICITY_CHARGE ajoutées aux factures concernées.'
              : 'ligne WATER_CHARGE ou ELECTRICITY_CHARGE ajoutée à la facture concernée.'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-5 text-warning" aria-hidden="true" />
            Lots ignorés ({skipped.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {skipped.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun lot ignoré.</p>
          ) : (
            <ul className="divide-y divide-border">
              {skipped.map((entry, index) => (
                <li
                  key={`${entry.propertyId}-${entry.unitId}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <span className="font-medium">{entry.unitId || 'Lot non rattaché'}</span>
                  <span className="text-muted-foreground">{entry.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <XCircle className="size-5 text-destructive" aria-hidden="true" />
            Erreurs ({errors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errors.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune erreur.</p>
          ) : (
            <ul className="divide-y divide-border">
              {errors.map((entry, index) => (
                <li
                  key={`${entry.meterId ?? entry.unitId ?? 'err'}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <span className="font-medium">
                    {entry.meterId ? `Compteur ${entry.meterId}` : (entry.unitId ?? 'Erreur')}
                  </span>
                  <span className="text-destructive">{entry.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
