export interface DunningTriggerReportProps {
  scanned: number;
  created: number;
  skipped: number;
  failed: number;
  dryRun: boolean;
}

/**
 * Compte-rendu pur d'un scan de relances (déclenché à la demande ou en
 * simulation). Composant de présentation extrait pour être testé isolément,
 * sur le modèle d'`UtilityRunReport` (phase 8).
 */
export function DunningTriggerReport({
  scanned,
  created,
  skipped,
  failed,
  dryRun,
}: DunningTriggerReportProps) {
  return (
    <div className="space-y-3 rounded-md border border-border p-4" aria-live="polite">
      {dryRun ? (
        <p className="text-sm font-medium text-muted-foreground">
          Simulation : aucune relance n&apos;a été envoyée.
        </p>
      ) : null}
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Examinées</dt>
          <dd className="text-2xl font-semibold">{scanned}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Créées</dt>
          <dd className="text-2xl font-semibold text-success">{created}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Ignorées</dt>
          <dd className="text-2xl font-semibold text-warning">{skipped}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">En échec</dt>
          <dd className="text-2xl font-semibold text-destructive">{failed}</dd>
        </div>
      </dl>
    </div>
  );
}
