import * as React from 'react';

import { useRefreshMomoTransaction } from '@/lib/api/hooks/use-mobile-money-transactions';
import type { MomoStatus } from '@/lib/api/types';

const POLL_INTERVAL_SECONDS = 3;
const WAITING_STATUSES: MomoStatus[] = ['INITIATED', 'PENDING'];

/**
 * Copie locale de `app/factures/[id]/_components/use-momo-status-polling.ts`
 * (générique, sans dépendance à une facture de loyer) : interroge
 * `/payments/mobile-money/transactions/{id}/refresh` toutes les 3 secondes
 * tant que la transaction est en attente, et s'arrête sur un statut final.
 */
export function useMomoStatusPolling(transactionId: string | null, initialStatus: MomoStatus) {
  const [status, setStatus] = React.useState<MomoStatus>(initialStatus);
  const [secondsRemaining, setSecondsRemaining] = React.useState(POLL_INTERVAL_SECONDS);
  const refresh = useRefreshMomoTransaction(transactionId ?? '');
  const refreshRef = React.useRef(refresh);
  refreshRef.current = refresh;

  React.useEffect(() => {
    setStatus(initialStatus);
    setSecondsRemaining(POLL_INTERVAL_SECONDS);
  }, [transactionId, initialStatus]);

  const isWaiting = Boolean(transactionId) && WAITING_STATUSES.includes(status);

  React.useEffect(() => {
    if (!isWaiting || !transactionId) return undefined;

    let cancelled = false;
    let remaining = POLL_INTERVAL_SECONDS;
    setSecondsRemaining(remaining);

    const tick = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        remaining = POLL_INTERVAL_SECONDS;
        refreshRef.current
          .mutateAsync()
          .then((transaction) => {
            if (!cancelled) setStatus(transaction.status);
          })
          .catch(() => {
            // Le prochain tick réessaiera ; le job serveur reprend de toute façon.
          });
      }
      setSecondsRemaining(remaining);
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(tick);
    };
  }, [isWaiting, transactionId]);

  return { status, secondsRemaining };
}
