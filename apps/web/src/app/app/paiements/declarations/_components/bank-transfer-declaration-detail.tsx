'use client';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AgedDeclarationNotice } from '@/components/business/aged-declaration-notice';
import { DeclarationStatusBadge } from '@/components/business/declaration-status-badge';
import { InvoiceTargetSummary } from '@/components/business/invoice-target-summary';
import { MoneyXaf } from '@/components/business/money-xaf';
import { ProofLink } from '@/components/business/proof-link';
import {
  useApproveBankTransferDeclaration,
  useRejectBankTransferDeclaration,
  useReviewBankTransferDeclaration,
} from '@/lib/api/hooks/use-bank-transfer-declarations';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import type { TransferDeclaration } from '@/lib/api/types';
import { ApproveDeclarationDialog } from './approve-declaration-dialog';
import { RejectDeclarationDialog } from './reject-declaration-dialog';

export interface BankTransferDeclarationDetailProps {
  declaration: TransferDeclaration;
  onClose: () => void;
}

/** Détail d'une déclaration de virement : preuve à côté de la facture visée, puis actions. */
export function BankTransferDeclarationDetail({
  declaration,
  onClose,
}: BankTransferDeclarationDetailProps) {
  const review = useReviewBankTransferDeclaration(declaration.id);
  const approve = useApproveBankTransferDeclaration(declaration.id);
  const reject = useRejectBankTransferDeclaration(declaration.id);

  const canReview = declaration.status === 'SUBMITTED';
  const canDecide = declaration.status === 'SUBMITTED' || declaration.status === 'UNDER_REVIEW';

  async function handleReview() {
    try {
      await review.mutateAsync();
      toast.success('Déclaration prise en charge.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Virement {declaration.transferReference ?? declaration.id}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <DeclarationStatusBadge status={declaration.status} />
            <AgedDeclarationNotice ageHours={declaration.ageHours} />
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Fermer
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Locataire</p>
            <p className="font-medium">{declaration.tenant?.displayName ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Payeur</p>
            <p className="font-medium">{declaration.payerName}</p>
            {declaration.payerBankName ? (
              <p className="text-muted-foreground">{declaration.payerBankName}</p>
            ) : null}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Montant déclaré</p>
            <p className="font-medium">
              <MoneyXaf amount={declaration.declaredAmount} />
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Date d&apos;exécution</p>
            <p className="font-medium">
              {new Date(declaration.transferDate).toLocaleDateString('fr-CG')}
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preuve</CardTitle>
            </CardHeader>
            <CardContent>
              <ProofLink documentId={declaration.proofDocumentId} />
            </CardContent>
          </Card>
          <InvoiceTargetSummary invoiceId={declaration.invoice?.id ?? null} />
        </div>

        {canDecide ? (
          <div className="flex flex-wrap items-center gap-2">
            {canReview ? (
              <Button
                type="button"
                variant="secondary"
                onClick={handleReview}
                disabled={review.isPending}
              >
                {review.isPending ? 'Prise en charge…' : 'Prise en charge'}
              </Button>
            ) : null}
            <ApproveDeclarationDialog
              declaredAmount={declaration.declaredAmount}
              onApprove={(input) => approve.mutateAsync(input)}
              onApproved={onClose}
            />
            <RejectDeclarationDialog
              onReject={(input) => reject.mutateAsync(input)}
              onRejected={onClose}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {declaration.status === 'REJECTED' && declaration.rejectionReason
              ? `Rejetée : ${declaration.rejectionReason}`
              : 'Cette déclaration a déjà été instruite.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
