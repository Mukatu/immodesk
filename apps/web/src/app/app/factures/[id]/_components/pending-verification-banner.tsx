'use client';

import { Clock } from 'lucide-react';

import { useBankTransferDeclarations } from '@/lib/api/hooks/use-bank-transfer-declarations';
import { usePayment } from '@/lib/api/hooks/use-payments';

export interface PendingVerificationBannerProps {
  invoiceId: string;
}

/**
 * Bandeau affiché quand un virement déclaré pour cette facture a été validé
 * avec `confirmOnApproval = false` (arbitrage 3 du contrat phase 4) : le
 * paiement créé est `PENDING_VERIFICATION`, non alloué, en attendant le
 * rapprochement bancaire. La déclaration reste le seul lien fiable vers la
 * facture (le paiement lui-même n'a pas d'`invoiceId`, ses allocations sont
 * vides tant qu'il n'est pas vérifié).
 */
export function PendingVerificationBanner({ invoiceId }: PendingVerificationBannerProps) {
  const { data } = useBankTransferDeclarations({ status: 'APPROVED' });
  const declaration = data?.items.find((item) => item.invoice?.id === invoiceId && item.paymentId);
  const { data: payment } = usePayment(declaration?.paymentId ?? null);

  if (!payment || payment.status !== 'PENDING_VERIFICATION') {
    return null;
  }

  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning"
    >
      <Clock className="size-5 shrink-0" aria-hidden="true" />
      <p className="font-medium">Paiement déclaré, en attente de confirmation bancaire.</p>
    </div>
  );
}
