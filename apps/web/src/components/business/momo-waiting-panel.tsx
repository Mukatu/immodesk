import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { MomoStatusBadge } from '@/components/business/momo-status-badge';
import type { MomoStatus } from '@/lib/api/types';

export interface MomoWaitingPanelProps {
  status: MomoStatus;
  /** Secondes restantes avant expiration de la fenêtre d'attente. */
  secondsRemaining: number;
  /** Annule la transaction en cours (proposé uniquement pendant l'attente). */
  onCancel?: () => void;
}

/** Formate un nombre de secondes en "mm:ss" (jamais de valeur négative). */
export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Panneau d'attente d'une transaction Mobile Money agrégateur en cours. Le
 * contenu s'adapte au statut (en attente, réussie, échouée, expirée) ; la zone
 * porte `role="status"` et `aria-live="polite"` pour annoncer le changement de
 * statut aux lecteurs d'écran.
 */
export function MomoWaitingPanel({ status, secondsRemaining, onCancel }: MomoWaitingPanelProps) {
  const isWaiting = status === 'PENDING' || status === 'INITIATED';

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-3 rounded-lg border border-border p-6 text-center"
    >
      <MomoStatusBadge status={status} />

      {isWaiting ? (
        <>
          <Loader2 className="size-8 animate-spin text-warning" aria-hidden="true" />
          <p className="font-medium">En attente de la confirmation du paiement Mobile Money…</p>
          <p className="text-2xl font-semibold tabular-nums">{formatCountdown(secondsRemaining)}</p>
          <p className="text-sm text-muted-foreground">
            Le locataire doit valider la demande reçue sur son téléphone.
          </p>
          {onCancel ? (
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Annuler
            </Button>
          ) : null}
        </>
      ) : status === 'SUCCEEDED' ? (
        <>
          <CheckCircle2 className="size-8 text-success" aria-hidden="true" />
          <p className="font-medium">Paiement confirmé avec succès.</p>
        </>
      ) : status === 'FAILED' || status === 'REJECTED' ? (
        <>
          <XCircle className="size-8 text-destructive" aria-hidden="true" />
          <p className="font-medium">Le paiement a échoué.</p>
        </>
      ) : status === 'EXPIRED' ? (
        <>
          <Clock className="size-8 text-destructive" aria-hidden="true" />
          <p className="font-medium">Le délai d&apos;attente est dépassé sans confirmation.</p>
          <p className="text-sm text-muted-foreground">Vous pouvez réessayer le paiement.</p>
        </>
      ) : (
        <p className="font-medium">Transaction {status.toLowerCase()}.</p>
      )}
    </div>
  );
}
