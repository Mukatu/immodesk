import type { ImportReport } from '@/lib/api/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ImportReportPanelProps {
  report: ImportReport;
  className?: string;
}

/**
 * Résumé d'un import de relevé bancaire (contrat Phase 6, `ImportReport`) :
 * compteurs de lignes acceptées, ignorées, rapprochées automatiquement et
 * suggérées, et détail des lignes en erreur.
 */
export function ImportReportPanel({ report, className }: ImportReportPanelProps) {
  const hasErrors = report.linesInError.length > 0;

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Rapport d&apos;import</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Lignes acceptées</dt>
            <dd className="text-lg font-semibold tabular-nums">{report.linesAccepted}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Lignes ignorées</dt>
            <dd className="text-lg font-semibold tabular-nums">{report.linesIgnored}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Rapprochées automatiquement</dt>
            <dd className="text-lg font-semibold tabular-nums">{report.autoMatched}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Suggérées</dt>
            <dd className="text-lg font-semibold tabular-nums">{report.suggested}</dd>
          </div>
        </dl>

        <div>
          <h4 className="text-sm font-medium">Lignes en erreur</h4>
          {hasErrors ? (
            <ul className="mt-2 space-y-1 text-sm">
              {report.linesInError.map((line) => (
                <li key={line.lineNumber} className="flex gap-2">
                  <span className="font-medium tabular-nums">Ligne {line.lineNumber}</span>
                  <span className="text-muted-foreground">{line.reason}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Aucune erreur</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
