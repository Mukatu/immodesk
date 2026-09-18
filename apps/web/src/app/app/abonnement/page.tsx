'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/business/page-header';
import { EmptyState } from '@/components/business/empty-state';
import { MoneyXaf } from '@/components/business/money-xaf';
import { useAuth } from '@/lib/auth/auth-context';
import {
  useCancelSubscription,
  useSubscription,
  useSubscriptionInvoices,
} from '@/lib/api/hooks/use-subscriptions';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import {
  BILLING_INTERVAL_LABELS,
  SUBSCRIPTION_INVOICE_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
} from '@/lib/enum-labels';
import type { SubscriptionInvoice, SubscriptionInvoiceStatus } from '@/lib/api/types';
import { formatDateFr } from './_components/format-date-fr';
import { ChangePlanDialog } from './_components/change-plan-dialog';
import { PaySubscriptionInvoiceDialog } from './_components/pay-subscription-invoice-dialog';

function invoiceBadgeVariant(
  status: SubscriptionInvoiceStatus,
): 'success' | 'warning' | 'destructive' | 'outline' {
  switch (status) {
    case 'PAID':
      return 'success';
    case 'OVERDUE':
      return 'destructive';
    case 'CANCELLED':
      return 'outline';
    default:
      return 'warning';
  }
}

export default function AbonnementPage() {
  const { currentOrganizationId, currentOrganization } = useAuth();
  const isOwner = currentOrganization?.role === 'OWNER';

  const { data: subscription, isLoading: loadingSubscription } =
    useSubscription(currentOrganizationId);
  const { data: invoicesData, isLoading: loadingInvoices } = useSubscriptionInvoices(
    currentOrganizationId,
    { limit: 20 },
  );
  const cancelSubscription = useCancelSubscription(currentOrganizationId ?? '');

  const [changePlanOpen, setChangePlanOpen] = React.useState(false);
  const [payingInvoice, setPayingInvoice] = React.useState<SubscriptionInvoice | null>(null);

  const invoices = invoicesData?.items ?? [];

  async function handleCancel() {
    try {
      await cancelSubscription.mutateAsync();
      toast.success('Résiliation enregistrée. Elle prendra effet en fin de période en cours.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Abonnement"
        description="Plan courant, historique des factures et paiement Mobile Money."
      />

      <Card>
        <CardHeader>
          <CardTitle>Plan courant</CardTitle>
          <CardDescription>
            Une seule ligne d&apos;abonnement par organisation : changer de plan met à jour cette
            ligne, sans historique des plans précédents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSubscription ? (
            <Skeleton className="h-24 w-full" />
          ) : subscription ? (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold">{subscription.plan.name}</p>
                  <Badge variant={subscription.status === 'ACTIVE' ? 'success' : 'warning'}>
                    {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {BILLING_INTERVAL_LABELS[subscription.plan.billingInterval]} —{' '}
                  {subscription.unitsCount} lots facturés
                </p>
                <p className="text-sm text-muted-foreground">
                  Période en cours : du {formatDateFr(subscription.currentPeriodStart)} au{' '}
                  {formatDateFr(subscription.currentPeriodEnd)}
                </p>
                {subscription.trialEndsAt ? (
                  <p className="text-sm text-muted-foreground">
                    Essai jusqu&apos;au {formatDateFr(subscription.trialEndsAt)}
                  </p>
                ) : null}
                {subscription.cancelledAt ? (
                  <p className="text-sm text-destructive">
                    Résiliation prévue en fin de période courante.
                  </p>
                ) : null}
              </div>
              <div className="text-right">
                <MoneyXaf amount={subscription.recurringAmount} className="text-2xl font-bold" />
                <p className="text-xs text-muted-foreground">par période</p>
              </div>
            </div>
          ) : (
            <EmptyState title="Aucun abonnement" description="Choisissez un plan pour démarrer." />
          )}

          {isOwner ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={() => setChangePlanOpen(true)}>
                Changer de plan
              </Button>
              {subscription && !subscription.cancelledAt ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={cancelSubscription.isPending}
                >
                  {cancelSubscription.isPending ? 'Résiliation…' : 'Résilier'}
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Factures d&apos;abonnement</CardTitle>
          <CardDescription>Un abonnement se règle en une fois par Mobile Money.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInvoices ? (
            <Skeleton className="h-40 w-full" />
          ) : invoices.length === 0 ? (
            <EmptyState title="Aucune facture" description="Aucune facture émise pour le moment." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Période</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  {isOwner ? <TableHead className="text-right">Action</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      {formatDateFr(invoice.periodStart)} – {formatDateFr(invoice.periodEnd)}
                    </TableCell>
                    <TableCell>{formatDateFr(invoice.dueDate)}</TableCell>
                    <TableCell>
                      <MoneyXaf amount={invoice.amount} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={invoiceBadgeVariant(invoice.status)}>
                        {SUBSCRIPTION_INVOICE_STATUS_LABELS[invoice.status]}
                      </Badge>
                    </TableCell>
                    {isOwner ? (
                      <TableCell className="text-right">
                        {invoice.status === 'ISSUED' || invoice.status === 'OVERDUE' ? (
                          <Button type="button" size="sm" onClick={() => setPayingInvoice(invoice)}>
                            Payer
                          </Button>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {isOwner ? (
        <>
          <ChangePlanDialog
            open={changePlanOpen}
            organizationId={currentOrganizationId ?? ''}
            currentPlanId={subscription?.plan.id ?? null}
            onClose={() => setChangePlanOpen(false)}
          />
          <PaySubscriptionInvoiceDialog
            invoice={payingInvoice}
            onClose={() => setPayingInvoice(null)}
          />
        </>
      ) : null}
    </div>
  );
}
