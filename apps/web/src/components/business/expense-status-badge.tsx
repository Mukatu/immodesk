import { Badge, type BadgeProps } from '@/components/ui/badge';
import { EXPENSE_STATUS_LABELS } from '@/lib/enum-labels';
import type { ExpenseStatus } from '@/lib/api/types';

const EXPENSE_STATUS_VARIANT: Record<ExpenseStatus, NonNullable<BadgeProps['variant']>> = {
  DRAFT: 'outline',
  SUBMITTED: 'secondary',
  APPROVED: 'success',
  PAID: 'success',
  REBILLED: 'secondary',
  REJECTED: 'destructive',
  CANCELLED: 'destructive',
};

export interface ExpenseStatusBadgeProps {
  status: ExpenseStatus;
  className?: string;
}

/** Badge de statut de dépense : couleur par statut, libellé fr-CG toujours affiché. */
export function ExpenseStatusBadge({ status, className }: ExpenseStatusBadgeProps) {
  return (
    <Badge variant={EXPENSE_STATUS_VARIANT[status]} className={className}>
      {EXPENSE_STATUS_LABELS[status]}
    </Badge>
  );
}
