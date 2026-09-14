'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AgedDeclarationNotice } from '@/components/business/aged-declaration-notice';
import { InvoiceTargetSummary } from '@/components/business/invoice-target-summary';
import { MomoStatusBadge } from '@/components/business/momo-status-badge';
import { MoneyXaf } from '@/components/business/money-xaf';
import { OperatorBadge } from '@/components/business/operator-badge';
import { PhoneDisplay } from '@/components/business/phone-display';
import { ProofLink } from '@/components/business/proof-link';
import {
  useApproveMomoDeclaration,
  useRejectMomoDeclaration,
} from '@/lib/api/hooks/use-mobile-money-declarations';
import { hoursSince } from '@/lib/aging';
import type { MomoTransaction } from '@/lib/api/types';
import { ApproveDeclarationDialog } from './approve-declaration-dialog';
import { RejectDeclarationDialog } from './reject-declaration-dialog';

export interface MomoDeclarationDetailProps {
  declaration: MomoTransaction;
  onClose: () => void;
}

/** Détail d'une déclaration Mobile Money : preuve à côté de la facture visée, puis actions. */
export function MomoDeclarationDetail({ declaration, onClose }: MomoDeclarationDetailProps) {
  const approve = useApproveMomoDeclaration(declaration.id);
  const reject = useRejectMomoDeclaration(declaration.id);
  const canDecide = declaration.status === 'DECLARED';

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Déclaration {declaration.merchantReference}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <MomoStatusBadge status={declaration.status} />
            <OperatorBadge msisdn={declaration.payerMsisdn} />
            <AgedDeclarationNotice ageHours={hoursSince(declaration.initiatedAt)} />
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
            <p className="text-xs text-muted-foreground">Numéro payeur</p>
            <PhoneDisplay phone={declaration.payerMsisdn} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Montant déclaré</p>
            <p className="font-medium">
              <MoneyXaf amount={declaration.amount} />
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Déclarée le</p>
            <p className="font-medium">
              {new Date(declaration.initiatedAt).toLocaleString('fr-CG')}
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
          <div className="flex items-center gap-2">
            <ApproveDeclarationDialog
              declaredAmount={declaration.amount}
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
