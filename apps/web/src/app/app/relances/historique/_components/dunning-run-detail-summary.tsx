import { MoneyXaf } from '@/components/business/money-xaf';
import { MESSAGE_STATUS_LABELS, NOTIFICATION_CHANNEL_LABELS } from '@/lib/enum-labels';
import type { DunningRun } from '@/lib/api/types';
import { DunningStepStatusBadge } from '../../_components/dunning-step-status-badge';

export interface DunningRunDetailSummaryProps {
  run: DunningRun;
}

/**
 * Résumé pur du détail d'une exécution de relance : statut, motif d'ignorance
 * éventuel, pénalité appliquée, message envoyé et escalade au garant.
 * Composant de présentation extrait pour être testé isolément.
 */
export function DunningRunDetailSummary({ run }: DunningRunDetailSummaryProps) {
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-muted-foreground">Statut</dt>
        <dd>
          <DunningStepStatusBadge status={run.status} />
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Canal</dt>
        <dd className="font-medium">{NOTIFICATION_CHANNEL_LABELS[run.channel]}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Solde au moment de l&apos;envoi</dt>
        <dd className="font-medium">
          <MoneyXaf amount={run.balanceAmount} />
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Jours de retard</dt>
        <dd className="font-medium">{run.daysOverdue}</dd>
      </div>
      {run.skipReason ? (
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Motif d&apos;ignorance</dt>
          <dd className="font-medium text-warning">{run.skipReason}</dd>
        </div>
      ) : null}
      {run.errorMessage ? (
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Message d&apos;échec</dt>
          <dd className="font-medium text-destructive">{run.errorMessage}</dd>
        </div>
      ) : null}
      <div>
        <dt className="text-muted-foreground">Message envoyé</dt>
        <dd className="font-medium">
          {run.messageStatus ? MESSAGE_STATUS_LABELS[run.messageStatus] : 'Aucun message'}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Escalade au garant</dt>
        <dd className="font-medium">{run.guarantorNotified ? 'Oui' : 'Non'}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Pénalité appliquée</dt>
        <dd className="font-medium">
          {run.penaltyApplied ? <MoneyXaf amount={run.penaltyAmount} /> : 'Aucune'}
        </dd>
      </div>
    </dl>
  );
}
