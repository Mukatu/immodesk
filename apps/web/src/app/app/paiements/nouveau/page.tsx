'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader } from '@/components/business/page-header';
import { EnumSelect } from '@/components/business/enum-select';
import { MoneyInput } from '@/components/business/money-input';
import { AllocationPreview } from '@/components/business/allocation-preview';
import { useTenants } from '@/lib/api/hooks/use-tenants';
import { useInvoices } from '@/lib/api/hooks/use-invoices';
import { useCreatePayment } from '@/lib/api/hooks/use-payments';
import { PAYMENT_METHOD_LABELS } from '@/lib/enum-labels';
import type { InvoiceStatus, PaymentMethod } from '@/lib/api/types';
import { ManualAllocationEditor } from './_components/manual-allocation-editor';

const OPEN_STATUSES: InvoiceStatus[] = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'];

export default function NouveauPaiementPage() {
  const router = useRouter();
  const [tenantQuery, setTenantQuery] = React.useState('');
  const [tenantId, setTenantId] = React.useState<string | null>(null);
  const [tenantLabel, setTenantLabel] = React.useState('');
  const [method, setMethod] = React.useState<PaymentMethod>('CASH');
  const [amount, setAmount] = React.useState<number | null>(null);
  const [autoAllocate, setAutoAllocate] = React.useState(true);
  const [manualAmounts, setManualAmounts] = React.useState<Record<string, number | null>>({});

  const tenantsQuery = useTenants({ q: tenantQuery, limit: 8 });
  const invoicesQuery = useInvoices({ tenantId: tenantId ?? undefined, limit: 100 });
  const createPayment = useCreatePayment();

  const openInvoices = React.useMemo(
    () =>
      (invoicesQuery.data?.items ?? [])
        .filter((invoice) => OPEN_STATUSES.includes(invoice.status))
        .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0)),
    [invoicesQuery.data],
  );

  function selectTenant(id: string, label: string) {
    setTenantId(id);
    setTenantLabel(label);
    setTenantQuery('');
    setManualAmounts({});
  }

  function changeTenant() {
    setTenantId(null);
    setTenantLabel('');
    setManualAmounts({});
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!tenantId || !amount || amount <= 0) {
      toast.error('Sélectionnez un locataire et saisissez un montant.');
      return;
    }
    try {
      const payment = await createPayment.mutateAsync(
        autoAllocate
          ? { method, amount, tenantId, autoAllocate: true, confirmed: method === 'CASH' }
          : {
              method,
              amount,
              tenantId,
              confirmed: method === 'CASH',
              allocations: Object.entries(manualAmounts)
                .filter(
                  (entry): entry is [string, number] =>
                    Boolean(entry[1]) && (entry[1] as number) > 0,
                )
                .map(([invoiceId, allocatedAmount]) => ({ invoiceId, amount: allocatedAmount })),
            },
      );
      toast.success(`Paiement ${payment.reference} enregistré.`);
      router.push(`/app/paiements/${payment.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer le paiement.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="Saisie au comptoir"
        description="Enregistrez un encaissement et affectez-le aux factures ouvertes."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Locataire</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tenantId ? (
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <span className="font-medium">{tenantLabel}</span>
                <Button type="button" variant="outline" size="sm" onClick={changeTenant}>
                  Changer
                </Button>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Rechercher un locataire…"
                  value={tenantQuery}
                  onChange={(e) => setTenantQuery(e.target.value)}
                  aria-label="Rechercher un locataire"
                />
                {tenantQuery && (tenantsQuery.data?.items.length ?? 0) > 0 ? (
                  <ul className="divide-y divide-border rounded-md border border-border">
                    {tenantsQuery.data?.items.map((tenant) => (
                      <li key={tenant.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => selectTenant(tenant.id, tenant.displayName)}
                        >
                          {tenant.displayName}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Encaissement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="payment-method" className="text-sm font-medium">
                  Mode de paiement
                </label>
                <EnumSelect<PaymentMethod>
                  id="payment-method"
                  value={method}
                  onValueChange={setMethod}
                  labels={PAYMENT_METHOD_LABELS}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="payment-amount" className="text-sm font-medium">
                  Montant encaissé
                </label>
                <MoneyInput id="payment-amount" value={amount} onValueChange={setAmount} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Affectation assistée</CardTitle>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={autoAllocate}
                onChange={(e) => setAutoAllocate(e.target.checked)}
              />
              Automatique (plus ancienne facture d&apos;abord)
            </label>
          </CardHeader>
          <CardContent>
            {autoAllocate ? (
              <AllocationPreview amount={amount} openInvoices={openInvoices} />
            ) : (
              <ManualAllocationEditor
                invoices={openInvoices}
                amounts={manualAmounts}
                onChange={(invoiceId, value) =>
                  setManualAmounts((prev) => ({ ...prev, [invoiceId]: value }))
                }
              />
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Annuler
          </Button>
          <Button type="submit" disabled={createPayment.isPending}>
            {createPayment.isPending ? 'Enregistrement…' : "Enregistrer l'encaissement"}
          </Button>
        </div>
      </form>
    </div>
  );
}
