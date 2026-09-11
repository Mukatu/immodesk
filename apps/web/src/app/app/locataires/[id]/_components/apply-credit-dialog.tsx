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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoneyXaf } from '@/components/business/money-xaf';
import { useInvoices } from '@/lib/api/hooks/use-invoices';
import { useApplyTenantCredit } from '@/lib/api/hooks/use-tenant-credits';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import type { TenantCredit } from '@/lib/api/types';

const OPEN_STATUSES = new Set(['ISSUED', 'PARTIALLY_PAID', 'OVERDUE']);

export interface ApplyCreditDialogProps {
  tenantId: string;
  credit: TenantCredit | null;
  onOpenChange: (open: boolean) => void;
}

/** Dialog d'application d'un crédit locataire disponible à une facture ouverte. */
export function ApplyCreditDialog({ tenantId, credit, onOpenChange }: ApplyCreditDialogProps) {
  const { data } = useInvoices({ tenantId, limit: 50 });
  const openInvoices = (data?.items ?? []).filter((i) => OPEN_STATUSES.has(i.status));
  const applyCredit = useApplyTenantCredit(tenantId, credit?.id ?? '');
  const [invoiceId, setInvoiceId] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setInvoiceId('');
    setAmount(credit ? String(credit.remainingAmount) : '');
    setError(null);
  }, [credit]);

  async function handleApply() {
    if (!invoiceId) {
      setError('Sélectionnez une facture.');
      return;
    }
    try {
      await applyCredit.mutateAsync({ invoiceId, amount: amount ? Number(amount) : undefined });
      toast.success('Crédit appliqué.');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={Boolean(credit)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Appliquer le crédit à une facture</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Crédit disponible : <MoneyXaf amount={credit?.remainingAmount ?? 0} />
          </p>
          <div className="space-y-2">
            <Label htmlFor="creditInvoice">Facture</Label>
            <Select value={invoiceId} onValueChange={setInvoiceId}>
              <SelectTrigger id="creditInvoice">
                <SelectValue placeholder="Sélectionner une facture ouverte" />
              </SelectTrigger>
              <SelectContent>
                {openInvoices.map((invoice) => (
                  <SelectItem key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber ?? 'Brouillon'} — solde {invoice.balanceAmount} XAF
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="creditAmount">Montant à appliquer (XAF)</Label>
            <Input
              id="creditAmount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleApply} disabled={applyCredit.isPending}>
            {applyCredit.isPending ? 'Application…' : 'Appliquer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
