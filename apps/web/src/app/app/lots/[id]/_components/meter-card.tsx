'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MoneyXaf } from '@/components/business/money-xaf';
import { MeterReadingChart } from '@/components/business/meter-reading-chart';
import { useMeterReadings } from '@/lib/api/hooks/use-meters';
import { METER_TYPE_LABELS } from '@/lib/enum-labels';
import type { Meter } from '@/lib/api/types';

/** Même convention que meter-reading-chart.tsx : pas de dépendance à l'ICU du runtime. */
function formatDateFr(iso: string): string {
  const date = new Date(iso);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export interface MeterCardProps {
  meter: Meter;
}

/**
 * Carte d'un compteur : dernier index connu, historique des relevés et
 * courbe de consommation. Un composant dédié par compteur, car chacun a
 * besoin de son propre appel `useMeterReadings` (règle des Hooks : impossible
 * d'appeler un hook dans la boucle `.map` du parent).
 */
export function MeterCard({ meter }: MeterCardProps) {
  const { data, isLoading } = useMeterReadings(meter.id, { limit: 12 });
  const readings = data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {METER_TYPE_LABELS[meter.meterType]} — N° {meter.serialNumber}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Dernier index :{' '}
          {meter.lastReading ? (
            <span className="font-medium text-foreground">
              {meter.lastReading.currentIndex} au {formatDateFr(meter.lastReading.readingDate)}
            </span>
          ) : (
            'aucun relevé'
          )}
        </p>

        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : readings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun relevé enregistré.</p>
        ) : (
          <>
            <MeterReadingChart data={data?.consumptionSeries ?? []} title="Consommation" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Historique des relevés</caption>
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th scope="col" className="py-1 pr-3 font-medium">
                      Date
                    </th>
                    <th scope="col" className="py-1 pr-3 font-medium">
                      Index
                    </th>
                    <th scope="col" className="py-1 pr-3 font-medium">
                      Consommation
                    </th>
                    <th scope="col" className="py-1 font-medium">
                      Montant
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((reading) => (
                    <tr key={reading.id} className="border-b border-border last:border-0">
                      <td className="py-1 pr-3">{formatDateFr(reading.readingDate)}</td>
                      <td className="py-1 pr-3 tabular-nums">{reading.currentIndex}</td>
                      <td className="py-1 pr-3 tabular-nums">{reading.consumption}</td>
                      <td className="py-1">
                        <MoneyXaf amount={reading.computedAmount} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
