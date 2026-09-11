import { Badge, type BadgeProps } from '@/components/ui/badge';
import { MESSAGE_STATUS_LABELS } from '@/lib/enum-labels';
import type { MessageStatus } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const MESSAGE_STATUS_VARIANT: Record<MessageStatus, NonNullable<BadgeProps['variant']>> = {
  QUEUED: 'outline',
  SENT: 'secondary',
  DELIVERED: 'success',
  READ: 'success',
  FAILED: 'destructive',
  REJECTED: 'destructive',
  EXPIRED: 'outline',
};

export interface MessageStatusBadgeProps {
  status: MessageStatus;
  className?: string;
}

/**
 * Badge de statut d'un message (WhatsApp/SMS) : envoyé, remis, lu, échec, etc.
 * Le libellé fr-CG est toujours affiché : la couleur ne porte jamais seule le sens.
 */
export function MessageStatusBadge({ status, className }: MessageStatusBadgeProps) {
  return (
    <Badge
      variant={MESSAGE_STATUS_VARIANT[status]}
      className={cn((status === 'FAILED' || status === 'REJECTED') && 'font-semibold', className)}
    >
      {MESSAGE_STATUS_LABELS[status]}
    </Badge>
  );
}
