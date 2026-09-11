'use client';

import { MoneyInput } from '@/components/business/money-input';
import { MoneyXaf } from '@/components/business/money-xaf';
import type { InvoiceSummary } from '@/lib/api/types';

export interface ManualAllocationEditorProps {
  invoices: InvoiceSummary[];
  amounts: Record<string, number | null>;
  onChange: (invoiceId: string, amount: number | null) => void;
}

/** Édition manuelle de l'affectation d'un paiement, facture ouverte par facture ouverte. */
export function ManualAllocationEditor({
  invoices,
  amounts,
  onChange,
}: ManualAllocationEditorProps) {
  if (invoices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Ce locataire n&apos;a aucune facture ouverte.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {invoices.map((invoice) => (
        <li
          key={invoice.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
        >
          <div className="text-sm">
            <p className="font-medium">{invoice.invoiceNumber ?? 'Brouillon'}</p>
            <p className="text-muted-foreground">
              Échéance {invoice.dueDate} — solde <MoneyXaf amount={invoice.balanceAmount} />
            </p>
          </div>
          <MoneyInput
            className="w-40"
            value={amounts[invoice.id] ?? null}
            onValueChange={(value) => onChange(invoice.id, value)}
            aria-label={`Montant affecté à la facture ${invoice.invoiceNumber ?? invoice.id}`}
          />
        </li>
      ))}
    </ul>
  );
}
