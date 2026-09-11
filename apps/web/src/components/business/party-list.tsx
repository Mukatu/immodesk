import { Badge } from '@/components/ui/badge';
import { LEASE_PARTY_ROLE_LABELS } from '@/lib/enum-labels';
import type { LeaseParty } from '@/lib/api/types';
import { EmptyState } from './empty-state';

/** Formate une date ISO en JJ/MM/AAAA, indépendamment de la locale de l'environnement. */
function formatDateFr(iso: string): string {
  const date = new Date(iso);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function formatShareBps(shareBps: number): string {
  const pct = shareBps / 100;
  const rounded = Math.round(pct * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(2)} %`;
}

export interface PartyListProps {
  parties: LeaseParty[];
}

/** Liste des parties (locataires, colocataires, garants, occupants) d'un bail. */
export function PartyList({ parties }: PartyListProps) {
  if (parties.length === 0) {
    return (
      <EmptyState
        title="Aucune partie"
        description="Aucun locataire ni garant n'est encore rattaché à ce bail."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {parties.map((party) => (
        <li key={party.id} className="flex flex-wrap items-center gap-2 py-3">
          <span className="font-medium">{party.displayName}</span>
          <Badge variant="outline">{LEASE_PARTY_ROLE_LABELS[party.role]}</Badge>
          {typeof party.shareBps === 'number' ? (
            <span className="text-sm text-muted-foreground">{formatShareBps(party.shareBps)}</span>
          ) : null}
          {party.isSolidary ? <Badge variant="secondary">Solidaire</Badge> : null}
          <span className="text-sm text-muted-foreground">
            {party.signedAt ? `Signé le ${formatDateFr(party.signedAt)}` : 'Non signé'}
          </span>
        </li>
      ))}
    </ul>
  );
}
