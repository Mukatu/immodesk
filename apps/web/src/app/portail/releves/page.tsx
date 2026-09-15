'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MoneyXaf } from '@/components/business/money-xaf';
import { StatementStatusBadge } from '@/components/business/statement-status-badge';
import { EmptyState } from '@/components/business/empty-state';
import { PageHeader } from '@/components/business/page-header';
import { usePortalStatementPdf, usePortalStatements } from '@/lib/api/hooks/use-portal';

function DownloadStatementButton({ id }: { id: string }) {
  const fetchPdf = usePortalStatementPdf(id);

  async function handleDownload() {
    const result = await fetchPdf.mutateAsync();
    window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleDownload}
      disabled={fetchPdf.isPending}
    >
      Télécharger
    </Button>
  );
}

export default function PortailRelevesPage() {
  const { data } = usePortalStatements({ limit: 50 });
  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes relevés de gérance"
        description="Consultation seule, téléchargement en PDF."
      />
      {items.length === 0 ? (
        <EmptyState
          title="Aucun relevé"
          description="Vos relevés apparaîtront ici une fois émis."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Période</TableHead>
              <TableHead className="text-right">Solde net</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.statementNumber}</TableCell>
                <TableCell>{s.periodStart.slice(0, 7)}</TableCell>
                <TableCell className="text-right">
                  <MoneyXaf amount={s.netPayableAmount} colorize />
                </TableCell>
                <TableCell>
                  <StatementStatusBadge status={s.status} />
                </TableCell>
                <TableCell>
                  <DownloadStatementButton id={s.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
