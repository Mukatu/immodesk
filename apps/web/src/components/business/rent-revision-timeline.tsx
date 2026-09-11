import type { RentRevision } from '@/lib/api/types';
import { EmptyState } from './empty-state';
import { MoneyXaf } from './money-xaf';

/**
 * Formate une date ISO en JJ/MM/AAAA sans dépendre de la locale de l'environnement
 * (toLocaleDateString('fr-CG') n'est pas garanti disponible en Node de test).
 */
function formatDateFr(iso: string): string {
  const date = new Date(iso);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export interface RentRevisionTimelineProps {
  revisions: RentRevision[];
}

/** Historique chronologique (le plus récent en premier) des révisions de loyer d'un bail. */
export function RentRevisionTimeline({ revisions }: RentRevisionTimelineProps) {
  if (revisions.length === 0) {
    return (
      <EmptyState title="Aucune révision" description="Le loyer initial est toujours en vigueur." />
    );
  }

  const sorted = [...revisions].sort(
    (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime(),
  );

  return (
    <ol className="space-y-4 border-l border-border pl-4">
      {sorted.map((revision) => (
        <li key={revision.id} className="space-y-1">
          <p className="text-sm text-muted-foreground">{formatDateFr(revision.effectiveDate)}</p>
          <p className="flex items-center gap-2 text-sm font-medium">
            <MoneyXaf amount={revision.previousRentAmount} />
            <span aria-hidden="true">→</span>
            <MoneyXaf amount={revision.newRentAmount} />
          </p>
          {revision.reason ? (
            <p className="text-sm text-muted-foreground">{revision.reason}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
