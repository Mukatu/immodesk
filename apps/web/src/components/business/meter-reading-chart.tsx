import { useId } from 'react';

import { MoneyXaf } from '@/components/business/money-xaf';
import { cn } from '@/lib/utils';
import type { ConsumptionPoint } from '@/lib/api/types';

export interface MeterReadingChartProps {
  data: ConsumptionPoint[];
  title?: string;
  className?: string;
}

/**
 * Formate une date ISO en JJ/MM/AAAA sans dépendre de la locale de
 * l'environnement (toLocaleDateString('fr-CG') n'est pas garanti disponible
 * dans le moteur ICU de Node/jsdom) — même convention que
 * rent-revision-timeline.tsx et format-date-fr.ts.
 */
function formatDateFr(iso: string): string {
  const date = new Date(iso);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 120;
const PADDING = 8;
const GAP = 4;

/**
 * Graphique en barres de la consommation d'un compteur, dessiné en SVG fait
 * main : le monorepo n'embarque aucune librairie de graphique (pas de
 * recharts/chart.js/d3/victory/visx), ajouter une dépendance pour un simple
 * histogramme ne se justifiait pas. Accessibilité en deux temps : le `<svg>`
 * porte `role="img"` et un `<title>`/`<desc>` qui résument les valeurs pour
 * les lecteurs d'écran et les info-bulles navigateur ; juste après, un
 * tableau `sr-only` (masqué visuellement, toujours dans le DOM) restitue
 * chaque relevé — date, consommation, montant — car les formes SVG seules ne
 * sont pas exploitables par les technologies d'assistance.
 */
export function MeterReadingChart({ data, title, className }: MeterReadingChartProps) {
  const titleId = useId();
  const descId = useId();
  const chartTitle = title ?? 'Graphique de consommation';

  if (data.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>Aucun relevé disponible.</p>
    );
  }

  const consumptions = data.map((point) => point.consumption);
  const maxConsumption = Math.max(...consumptions, 0);
  const minConsumption = Math.min(...consumptions);
  const description = `${data.length} relevé${data.length > 1 ? 's' : ''}, consommation minimale ${minConsumption}, maximale ${maxConsumption}.`;
  const barWidth = (CHART_WIDTH - PADDING * 2 - GAP * (data.length - 1)) / data.length;

  return (
    <div className={cn('space-y-2', className)}>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        className="h-auto w-full text-primary"
      >
        <title id={titleId}>{chartTitle}</title>
        <desc id={descId}>{description}</desc>
        {data.map((point, index) => {
          const ratio = maxConsumption > 0 ? point.consumption / maxConsumption : 0;
          const barHeight = ratio * (CHART_HEIGHT - PADDING * 2);
          const x = PADDING + index * (barWidth + GAP);
          const y = CHART_HEIGHT - PADDING - barHeight;
          return (
            <rect
              key={`${point.readingDate}-${index}`}
              x={x}
              y={y}
              width={Math.max(barWidth, 0)}
              height={Math.max(barHeight, 0)}
              fill="currentColor"
              rx={2}
            />
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>{chartTitle}</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Consommation</th>
            <th scope="col">Montant</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point, index) => (
            <tr key={`${point.readingDate}-${index}`}>
              <td>{formatDateFr(point.readingDate)}</td>
              <td>{point.consumption}</td>
              <td>
                <MoneyXaf amount={point.computedAmount} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
