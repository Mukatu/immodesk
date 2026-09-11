import { Badge, type BadgeProps } from '@/components/ui/badge';
import { INVOICE_STATUS_LABELS } from '@/lib/enum-labels';
import type { InvoiceStatus } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const INVOICE_STATUS_VARIANT: Record<InvoiceStatus, NonNullable<BadgeProps['variant']>> = {
  DRAFT: 'outline',
  ISSUED: 'secondary',
  PARTIALLY_PAID: 'warning',
  PAID: 'success',
  OVERDUE: 'destructive',
  CANCELLED: 'outline',
};

export interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

/** Badge de statut de facture (6 statuts du contrat) : couleur + libellé fr-CG toujours affiché. */
export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  return (
    <Badge
      variant={INVOICE_STATUS_VARIANT[status]}
      className={cn(status === 'CANCELLED' && 'line-through opacity-70', className)}
    >
      {INVOICE_STATUS_LABELS[status]}
    </Badge>
  );
}
