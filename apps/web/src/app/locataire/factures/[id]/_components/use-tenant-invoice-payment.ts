import * as React from 'react';

import { usePayTenantInvoice } from '@/lib/api/hooks/use-tenant-portal';
import { ApiError, genericErrorMessage } from '@/lib/api/tenant-client';
import type { MomoStatus } from '@/lib/api/types';

const POLL_INTERVAL_SECONDS = 3;
const WAITING_STATUSES: MomoStatus[] = ['INITIATED', 'PENDING'];

/**
 * Le portail locataire n'a qu'une seule route de paiement
 * (`POST /tenant/invoices/{id}/pay`, voir use-tenant-portal.ts), pas de route
 * de rafraîchissement séparée comme côté agence : la re-interrogation de la
 * phase 4 se fait en rappelant cette même route avec le même `clientRef`,
 * jusqu'à un statut final (le serveur mock avance sa simulation d'un cran à
 * chaque appel).
 */
export function useTenantInvoicePayment(invoiceId: string) {
  const pay = usePayTenantInvoice(invoiceId);
  const [status, setStatus] = React.useState<MomoStatus | null>(null);
  const [secondsRemaining, setSecondsRemaining] = React.useState(POLL_INTERVAL_SECONDS);
  const [error, setError] = React.useState<string | null>(null);
  const paramsRef = React.useRef<{ payerMsisdn: string; clientRef: string } | null>(null);

  const isWaiting = Boolean(status) && WAITING_STATUSES.includes(status as MomoStatus);

  async function start(payerMsisdn: string) {
    setError(null);
    const params = { payerMsisdn, clientRef: crypto.randomUUID() };
    paramsRef.current = params;
    try {
      const result = await pay.mutateAsync(params);
      setStatus(result.status);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  React.useEffect(() => {
    if (!isWaiting || !paramsRef.current) return undefined;

    let cancelled = false;
    let remaining = POLL_INTERVAL_SECONDS;
    setSecondsRemaining(remaining);

    const tick = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        remaining = POLL_INTERVAL_SECONDS;
        if (paramsRef.current) {
          pay
            .mutateAsync(paramsRef.current)
            .then((result) => {
              if (!cancelled) setStatus(result.status);
            })
            .catch(() => {
              // Le prochain tick réessaiera.
            });
        }
      }
      setSecondsRemaining(remaining);
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWaiting]);

  function reset() {
    setStatus(null);
    setError(null);
    paramsRef.current = null;
  }

  return { start, reset, status, secondsRemaining, isSubmitting: pay.isPending, error };
}
