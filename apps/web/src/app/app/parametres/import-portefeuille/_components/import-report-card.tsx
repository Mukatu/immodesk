'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/business/empty-state';
import {
  PORTFOLIO_IMPORT_ENTITY_TYPE_LABELS,
  PORTFOLIO_IMPORT_STATUS_LABELS,
} from '@/lib/enum-labels';
import type { PortfolioImportReport } from '@/lib/api/types';

export interface ImportReportCardProps {
  report: PortfolioImportReport;
  onRestart: () => void;
}

/** Génère un CSV point-virgule des rejets, motivés en français, et déclenche son téléchargement. */
function downloadRejectionsCsv(report: PortfolioImportReport) {
  const header = "Ligne;Type d'entité;Motif";
  const rows = report.rejections.map(
    (r) =>
      `${r.line};${PORTFOLIO_IMPORT_ENTITY_TYPE_LABELS[r.entityType]};"${r.reason.replace(/"/g, '""')}"`,
  );
  const csv = [header, ...rows].join('\r\n');
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rejets-import-${report.jobId}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Rapport d'un import terminé ou en échec, avec la liste des rejets ligne à ligne. */
export function ImportReportCard({ report, onRestart }: ImportReportCardProps) {
  const isFinal = report.status === 'DONE' || report.status === 'FAILED';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge
            variant={
              report.status === 'DONE'
                ? 'success'
                : report.status === 'FAILED'
                  ? 'destructive'
                  : 'warning'
            }
          >
            {PORTFOLIO_IMPORT_STATUS_LABELS[report.status]}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {report.linesRead} lignes lues, {report.linesCreated} créées, {report.linesRejected}{' '}
            rejetées
          </span>
        </div>
        {isFinal ? (
          <div className="flex gap-2">
            {report.rejections.length > 0 ? (
              <Button type="button" variant="outline" onClick={() => downloadRejectionsCsv(report)}>
                Télécharger les rejets (CSV)
              </Button>
            ) : null}
            <Button type="button" onClick={onRestart}>
              Nouvel import
            </Button>
          </div>
        ) : null}
      </div>

      {report.rejections.length === 0 ? (
        isFinal ? (
          <EmptyState
            title="Aucun rejet"
            description="Toutes les lignes lues ont été créées avec succès."
          />
        ) : null
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ligne</TableHead>
              <TableHead>Type d&apos;entité</TableHead>
              <TableHead>Motif</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rejections.map((rejection, index) => (
              <TableRow key={`${rejection.line}-${index}`}>
                <TableCell>{rejection.line}</TableCell>
                <TableCell>{PORTFOLIO_IMPORT_ENTITY_TYPE_LABELS[rejection.entityType]}</TableCell>
                <TableCell>{rejection.reason}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
