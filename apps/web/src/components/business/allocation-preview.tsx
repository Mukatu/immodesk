import { MoneyXaf } from '@/components/business/money-xaf';
import { cn } from '@/lib/utils';

export interface OpenInvoiceForAllocation {
  id: string;
  invoiceNumber: string | null;
  dueDate: string;
  balanceAmount: number;
}

export interface AllocationLine {
  invoiceId: string;
  invoiceNumber: string | null;
  dueDate: string;
  balanceAmount: number;
  allocatedAmount: number;
  remainingAfter: number;
}

export interface AllocationPreviewResult {
  lines: AllocationLine[];
  totalAllocated: number;
  creditAmount: number;
}

/**
 * Calcule la répartition d'un montant sur les factures ouvertes d'un locataire,
 * selon la règle d'ordre figée du contrat : la facture la plus ancienne (dueDate
 * croissante) est servie en premier. Le reliquat non affecté devient un crédit.
 */
export function computeAllocationPreview(
  amount: number | null,
  openInvoices: OpenInvoiceForAllocation[],
): AllocationPreviewResult {
  const total = amount && amount > 0 ? amount : 0;
  const sorted = [...openInvoices].sort((a, b) =>
    a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0,
  );

  let remaining = total;
  const lines: AllocationLine[] = [];
  for (const invoice of sorted) {
    if (remaining <= 0) break;
    if (invoice.balanceAmount <= 0) continue;
    const allocated = Math.min(remaining, invoice.balanceAmount);
    remaining -= allocated;
    lines.push({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      dueDate: invoice.dueDate,
      balanceAmount: invoice.balanceAmount,
      allocatedAmount: allocated,
      remainingAfter: invoice.balanceAmount - allocated,
    });
  }

  return {
    lines,
    totalAllocated: total - remaining,
    creditAmount: remaining,
  };
}

export interface AllocationPreviewProps {
  amount: number | null;
  openInvoices: OpenInvoiceForAllocation[];
  className?: string;
}

/** Aperçu de la répartition automatique d'un encaissement sur les factures ouvertes d'un locataire. */
export function AllocationPreview({ amount, openInvoices, className }: AllocationPreviewProps) {
  const result = computeAllocationPreview(amount, openInvoices);

  if (!amount || amount <= 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        Saisissez un montant pour voir l&apos;affectation proposée.
      </p>
    );
  }

  if (openInvoices.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        Ce locataire n&apos;a aucune facture ouverte : le montant sera intégralement crédité.
      </p>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <ul className="space-y-1">
        {result.lines.map((line) => (
          <li
            key={line.invoiceId}
            className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
          >
            <span>
              Facture {line.invoiceNumber ?? 'brouillon'} (échéance {line.dueDate}) : vous allouez{' '}
              <MoneyXaf amount={line.allocatedAmount} /> — reste{' '}
              <MoneyXaf amount={line.remainingAfter} />
            </span>
          </li>
        ))}
      </ul>
      {result.creditAmount > 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Reliquat de <MoneyXaf amount={result.creditAmount} /> — sera crédité au locataire.
        </p>
      ) : null}
    </div>
  );
}
