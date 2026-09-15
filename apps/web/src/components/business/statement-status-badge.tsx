import { Badge, type BadgeProps } from '@/components/ui/badge';
import { OWNER_STATEMENT_STATUS_LABELS } from '@/lib/enum-labels';
import type { OwnerStatementStatus } from '@/lib/api/types';

const STATEMENT_STATUS_VARIANT: Record<OwnerStatementStatus, NonNullable<BadgeProps['variant']>> = {
  DRAFT: 'outline',
  ISSUED: 'secondary',
  SENT: 'default',
  PAID: 'success',
  CANCELLED: 'destructive',
};

export interface StatementStatusBadgeProps {
  status: OwnerStatementStatus;
  className?: string;
}

/** Badge de statut de relevé de gérance : couleur par statut, libellé fr-CG toujours affiché. */
export function StatementStatusBadge({ status, className }: StatementStatusBadgeProps) {
  return (
    <Badge variant={STATEMENT_STATUS_VARIANT[status]} className={className}>
      {OWNER_STATEMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
