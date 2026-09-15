'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoneyInput } from '@/components/business/money-input';
import { useTenants } from '@/lib/api/hooks/use-tenants';
import { useInvoices } from '@/lib/api/hooks/use-invoices';
import { useCreateBankCheck } from '@/lib/api/hooks/use-bank-checks';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { ApiErrorCode } from '@/lib/api/types';

const EMPTY = {
  checkNumber: '',
  drawerName: '',
  drawerBankCode: '',
  drawerBankName: '',
  notes: '',
};

/** Dialog de saisie d'un chèque reçu d'un locataire (`BankCheckInput`, phase 6). */
export function CreateCheckDialog() {
  const [open, setOpen] = React.useState(false);
  const [tenantQuery, setTenantQuery] = React.useState('');
  const [tenantId, setTenantId] = React.useState<string | null>(null);
  const [tenantLabel, setTenantLabel] = React.useState('');
  const [invoiceId, setInvoiceId] = React.useState('');
  const [fields, setFields] = React.useState(EMPTY);
  const [amount, setAmount] = React.useState<number | null>(null);
  const [issueDate, setIssueDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = React.useState<string | null>(null);

  const tenantsQuery = useTenants({ q: tenantQuery || undefined, limit: 8 });
  const invoicesQuery = useInvoices({ tenantId: tenantId ?? undefined, limit: 50 });
  const createCheck = useCreateBankCheck();

  function reset() {
    setTenantQuery('');
    setTenantId(null);
    setTenantLabel('');
    setInvoiceId('');
    setFields(EMPTY);
    setAmount(null);
    setIssueDate(new Date().toISOString().slice(0, 10));
    setError(null);
  }

  async function handleSubmit() {
    if (
      !tenantId ||
      !fields.checkNumber.trim() ||
      !fields.drawerName.trim() ||
      !fields.drawerBankCode.trim() ||
      !fields.drawerBankName.trim() ||
      !amount ||
      amount <= 0
    ) {
      setError('Locataire, numéro de chèque, tireur, banque du tireur et montant sont requis.');
      return;
    }
    setError(null);
    const invoice = invoicesQuery.data?.items.find((i) => i.id === invoiceId);
    try {
      await createCheck.mutateAsync({
        tenantId,
        leaseId: invoice?.lease.id,
        invoiceId: invoiceId || undefined,
        checkNumber: fields.checkNumber.trim(),
        drawerName: fields.drawerName.trim(),
        drawerBankCode: fields.drawerBankCode.trim(),
        drawerBankName: fields.drawerBankName.trim(),
        amount,
        issueDate,
        notes: fields.notes.trim() || undefined,
      });
      toast.success('Chèque enregistré.');
      setOpen(false);
      reset();
    } catch (err) {
      if (err instanceof ApiError && err.code === ApiErrorCode.CHECK_ALREADY_REGISTERED) {
        setError('Ce numéro de chèque est déjà enregistré pour cette banque.');
      } else {
        setError(err instanceof ApiError ? err.message : genericErrorMessage);
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button">Enregistrer un chèque reçu</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enregistrer un chèque reçu</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="checkTenant">Locataire</Label>
            {tenantId ? (
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <span className="font-medium">{tenantLabel}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTenantId(null);
                    setTenantLabel('');
                    setInvoiceId('');
                  }}
                >
                  Changer
                </Button>
              </div>
            ) : (
              <>
                <Input
                  id="checkTenant"
                  placeholder="Rechercher un locataire…"
                  value={tenantQuery}
                  onChange={(e) => setTenantQuery(e.target.value)}
                />
                {tenantQuery && (tenantsQuery.data?.items.length ?? 0) > 0 ? (
                  <ul className="divide-y divide-border rounded-md border border-border">
                    {tenantsQuery.data?.items.map((tenant) => (
                      <li key={tenant.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            setTenantId(tenant.id);
                            setTenantLabel(tenant.displayName);
                            setTenantQuery('');
                          }}
                        >
                          {tenant.displayName}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </div>

          {tenantId ? (
            <div className="space-y-2">
              <Label htmlFor="checkInvoice">Facture réglée (facultatif)</Label>
              <Select value={invoiceId} onValueChange={setInvoiceId}>
                <SelectTrigger id="checkInvoice">
                  <SelectValue placeholder="Aucune facture liée" />
                </SelectTrigger>
                <SelectContent>
                  {(invoicesQuery.data?.items ?? []).map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber ?? invoice.id} — échéance {invoice.dueDate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="checkNumber">Numéro de chèque</Label>
              <Input
                id="checkNumber"
                value={fields.checkNumber}
                onChange={(e) => setFields((f) => ({ ...f, checkNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkAmount">Montant</Label>
              <MoneyInput id="checkAmount" value={amount} onValueChange={setAmount} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkDrawerName">Nom du tireur</Label>
              <Input
                id="checkDrawerName"
                value={fields.drawerName}
                onChange={(e) => setFields((f) => ({ ...f, drawerName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkIssueDate">Date d’émission</Label>
              <Input
                id="checkIssueDate"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkDrawerBankName">Banque du tireur</Label>
              <Input
                id="checkDrawerBankName"
                value={fields.drawerBankName}
                onChange={(e) => setFields((f) => ({ ...f, drawerBankName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkDrawerBankCode">Code banque du tireur</Label>
              <Input
                id="checkDrawerBankCode"
                value={fields.drawerBankCode}
                onChange={(e) => setFields((f) => ({ ...f, drawerBankCode: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkNotes">Notes</Label>
            <Textarea
              id="checkNotes"
              value={fields.notes}
              onChange={(e) => setFields((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={handleSubmit} disabled={createCheck.isPending}>
            {createCheck.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
