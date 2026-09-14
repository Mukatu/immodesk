import type { DeclarationStatus } from '@/lib/api/types';
import { TRANSFER_DECLARATION_STATUS_LABELS } from '@/lib/enum-labels';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface DeclarationStatusBadgeProps {
  status: DeclarationStatus;
  className?: string;
}

/**
 * Variant Badge par statut de déclaration de virement bancaire.
 * APPROVED/MATCHED = validée, REJECTED/CANCELLED = classée sans suite,
 * SUBMITTED/UNDER_REVIEW = en instruction.
 */
const DECLARATION_STATUS_VARIANTS: Record<DeclarationStatus, NonNullable<BadgeProps['variant']>> = {
  SUBMITTED: 'warning',
  UNDER_REVIEW: 'warning',
  MATCHED: 'success',
  APPROVED: 'success',
  REJECTED: 'destructive',
  CANCELLED: 'destructive',
};

/** Badge de statut d'une déclaration de virement bancaire, avec libellé fr-CG. */
export function DeclarationStatusBadge({ status, className }: DeclarationStatusBadgeProps) {
  return (
    <Badge variant={DECLARATION_STATUS_VARIANTS[status]} className={cn(className)}>
      {TRANSFER_DECLARATION_STATUS_LABELS[status]}
    </Badge>
  );
}
