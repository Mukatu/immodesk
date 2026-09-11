import { Badge, type BadgeProps } from '@/components/ui/badge';
import { PAYMENT_STATUS_LABELS } from '@/lib/enum-labels';
import type { PaymentStatus } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const PAYMENT_STATUS_VARIANT: Record<PaymentStatus, NonNullable<BadgeProps['variant']>> = {
  PENDING: 'outline',
  PENDING_VERIFICATION: 'warning',
  CONFIRMED: 'success',
  REJECTED: 'destructive',
  CANCELLED: 'outline',
  REVERSED: 'outline',
};

export interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

/** Badge de statut de paiement (6 statuts du contrat) : couleur + libellé fr-CG toujours affiché. */
export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
  return (
    <Badge
      variant={PAYMENT_STATUS_VARIANT[status]}
      className={cn(
        (status === 'CANCELLED' || status === 'REVERSED') && 'line-through opacity-70',
        className,
      )}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
