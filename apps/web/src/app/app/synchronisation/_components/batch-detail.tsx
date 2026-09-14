'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SyncBatchStatusBadge } from '@/components/business/sync-batch-status-badge';
import { SyncOutcomeBadge } from '@/components/business/sync-outcome-badge';
import { useSyncBatch } from '@/lib/api/hooks/use-sync-batches';
import { SYNC_OPERATION_TYPE_LABELS } from '@/lib/enum-labels';

export interface BatchDetailProps {
  batchId: string;
  onClose: () => void;
}

/** Détail d'un lot : chaque opération avec son issue, son code d'erreur et son message (livrable 2). */
export function BatchDetail({ batchId, onClose }: BatchDetailProps) {
  const { data: batch, isLoading } = useSyncBatch(batchId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Détail du lot</CardTitle>
          {batch ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <SyncBatchStatusBadge status={batch.status} />
              <span>{batch.collector.fullName}</span>
              <span aria-hidden="true">·</span>
              <span>{batch.deviceId}</span>
            </div>
          ) : null}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Fermer
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading || !batch ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Code d&apos;erreur</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batch.results.map((result) => (
                <TableRow key={result.clientRef}>
                  <TableCell className="font-mono text-xs">{result.clientRef}</TableCell>
                  <TableCell>{SYNC_OPERATION_TYPE_LABELS[result.type]}</TableCell>
                  <TableCell>
                    <SyncOutcomeBadge outcome={result.outcome} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{result.code ?? '—'}</TableCell>
                  <TableCell>{result.message ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
