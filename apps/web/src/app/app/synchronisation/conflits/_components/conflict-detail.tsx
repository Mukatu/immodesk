'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConflictResolutionDialog } from '@/components/business/conflict-resolution-dialog';
import { InvoiceStatusBadge } from '@/components/business/invoice-status-badge';
import { MoneyXaf } from '@/components/business/money-xaf';
import { useInvoices } from '@/lib/api/hooks/use-invoices';
import { useResolveSyncConflict } from '@/lib/api/hooks/use-sync-conflicts';
import { formatAgeHours, hoursSince } from '@/lib/aging';
import type { SyncConflict } from '@/lib/api/types';

export interface ConflictDetailProps {
  conflict: SyncConflict;
  onClose: () => void;
}

interface CashReceiptPayload {
  amount?: number;
  payerName?: string;
  tenantId?: string;
  invoiceId?: string;
  clientCreatedAt?: string;
}

function isCashReceiptPayload(value: unknown): value is CashReceiptPayload {
  return typeof value === 'object' && value !== null;
}

/**
 * Détail d'un conflit : corps d'origine de l'opération face à l'état actuel
 * de la facture concernée (livrable 3), puis résolution en deux choix.
 */
export function ConflictDetail({ conflict, onClose }: ConflictDetailProps) {
  const resolve = useResolveSyncConflict(conflict.id);
  const payload = isCashReceiptPayload(conflict.payload) ? conflict.payload : {};

  const invoicesQuery = useInvoices({ limit: 100 });
  const invoiceOptions = React.useMemo(
    () =>
      (invoicesQuery.data?.items ?? [])
        .filter(
          (invoice) => invoice.status !== 'CANCELLED' && invoice.id !== conflict.targetInvoice?.id,
        )
        .map((invoice) => ({
          id: invoice.id,
          label: `${invoice.invoiceNumber ?? invoice.id} — ${invoice.tenant.displayName} — solde ${invoice.balanceAmount} XAF`,
        })),
    [invoicesQuery.data, conflict.targetInvoice],
  );

  const originalInvoiceLabel = conflict.targetInvoice
    ? (conflict.targetInvoice.invoiceNumber ?? conflict.targetInvoice.id)
    : 'facture introuvable';

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Conflit {conflict.clientRef}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {conflict.collector.fullName} · appareil {conflict.deviceId} · ancienneté{' '}
            {formatAgeHours(hoursSince(conflict.clientCreatedAt))}
          </p>
          <p className="text-sm font-medium text-foreground">{conflict.message}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Fermer
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Corps d&apos;origine de l&apos;opération</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Payeur déclaré</span>
                <span className="font-medium">{payload.payerName ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Montant</span>
                <span className="font-medium">
                  {typeof payload.amount === 'number' ? <MoneyXaf amount={payload.amount} /> : '—'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Facture visée à l&apos;origine</span>
                <span className="font-mono text-xs">{payload.invoiceId ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Saisi hors ligne le</span>
                <span className="font-medium">
                  {payload.clientCreatedAt
                    ? new Date(payload.clientCreatedAt).toLocaleString('fr-CG')
                    : '—'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">État actuel de la facture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {conflict.targetInvoice ? (
                <>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Facture</span>
                    <span className="font-medium">
                      {conflict.targetInvoice.invoiceNumber ?? conflict.targetInvoice.id}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Statut</span>
                    <InvoiceStatusBadge status={conflict.targetInvoice.status} />
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Solde actuel</span>
                    <span className="font-medium">
                      <MoneyXaf amount={conflict.targetInvoice.balanceAmount} />
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Locataire</span>
                    <span className="font-medium">{conflict.targetInvoice.tenantDisplayName}</span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">
                  La facture visée à l&apos;origine est introuvable.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {conflict.resolvedAt ? (
          <p className="text-sm text-muted-foreground">
            Résolu le {new Date(conflict.resolvedAt).toLocaleString('fr-CG')}
            {conflict.resolution === 'DISCARDED' && conflict.resolutionReason
              ? ` — abandonné : ${conflict.resolutionReason}`
              : conflict.resolution === 'APPLIED'
                ? ' — appliqué.'
                : ''}
          </p>
        ) : (
          <ConflictResolutionDialog
            originalInvoiceLabel={originalInvoiceLabel}
            invoiceOptions={invoiceOptions}
            onApply={(input) =>
              resolve.mutateAsync({
                decision: 'APPLY',
                overrides: { invoiceId: input.invoiceId, autoAllocate: input.autoAllocate },
              })
            }
            onDiscard={(input) =>
              resolve.mutateAsync({ decision: 'DISCARD', reason: input.reason })
            }
            onResolved={onClose}
          />
        )}
      </CardContent>
    </Card>
  );
}
