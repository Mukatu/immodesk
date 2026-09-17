'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/business/empty-state';
import { MeterReadingChart } from '@/components/business/meter-reading-chart';
import { useConfirmMeterReading, useMeterReadings } from '@/lib/api/hooks/use-meters';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { ReadingRow } from './reading-row';

const PAGE_SIZE = 20;

export interface ReadingsSectionProps {
  meterId: string;
  /** Seul un MANAGER peut confirmer un relevé estimé (`PATCH /v1/meter-readings/{id}`). */
  canConfirm: boolean;
}

/** Historique paginé des relevés d'un compteur, avec le graphe de consommation. */
export function ReadingsSection({ meterId, canConfirm }: ReadingsSectionProps) {
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [previousCursors, setPreviousCursors] = React.useState<string[]>([]);
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);

  const { data, isLoading } = useMeterReadings(meterId, { cursor, limit: PAGE_SIZE });
  const confirmReading = useConfirmMeterReading();

  async function handleConfirm(readingId: string) {
    setConfirmingId(readingId);
    try {
      await confirmReading.mutateAsync({ id: readingId, body: { isEstimated: false } });
      toast.success('Relevé confirmé.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : genericErrorMessage);
    } finally {
      setConfirmingId(null);
    }
  }

  function handleNextPage() {
    if (data?.pageInfo.nextCursor) {
      setPreviousCursors((prev) => [...prev, cursor ?? '']);
      setCursor(data.pageInfo.nextCursor);
    }
  }

  function handlePreviousPage() {
    setPreviousCursors((prev) => {
      const next = [...prev];
      const last = next.pop();
      setCursor(last || undefined);
      return next;
    });
  }

  const readings = data?.items ?? [];

  return (
    <div className="space-y-6">
      <MeterReadingChart data={data?.consumptionSeries ?? []} title="Consommation du compteur" />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : readings.length === 0 ? (
        <EmptyState
          title="Aucun relevé"
          description="Saisissez le premier relevé de ce compteur."
        />
      ) : (
        <div className="space-y-3">
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Index</TableHead>
                  <TableHead>Consommation</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Relevé</TableHead>
                  <TableHead>Facturation</TableHead>
                  <TableHead>Photo</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {readings.map((reading) => (
                  <ReadingRow
                    key={reading.id}
                    reading={reading}
                    canConfirm={canConfirm}
                    isConfirming={confirmingId === reading.id}
                    onConfirm={() => handleConfirm(reading.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={previousCursors.length === 0}
            >
              Précédent
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!data?.pageInfo.hasNextPage}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
