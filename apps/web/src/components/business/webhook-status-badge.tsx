import type { WebhookStatus } from '@/lib/api/types';
import { WEBHOOK_STATUS_LABELS } from '@/lib/enum-labels';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface WebhookStatusBadgeProps {
  status: WebhookStatus;
  /** Validité de la signature du webhook, quand elle a été vérifiée. */
  signatureValid?: boolean | null;
  className?: string;
}

/** Variant Badge par statut d'événement webhook. PROCESSED = succès, FAILED = échec. */
const WEBHOOK_STATUS_VARIANTS: Record<WebhookStatus, NonNullable<BadgeProps['variant']>> = {
  RECEIVED: 'outline',
  PROCESSING: 'warning',
  PROCESSED: 'success',
  IGNORED: 'outline',
  FAILED: 'destructive',
};

/**
 * Badge de statut d'un événement webhook, avec libellé fr-CG. Quand `signatureValid`
 * est fourni (booléen), un second badge affiche la validité de la signature en texte
 * ("Signature valide" / "Signature invalide") : jamais la couleur seule.
 */
export function WebhookStatusBadge({ status, signatureValid, className }: WebhookStatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Badge variant={WEBHOOK_STATUS_VARIANTS[status]}>{WEBHOOK_STATUS_LABELS[status]}</Badge>
      {typeof signatureValid === 'boolean' ? (
        <Badge variant={signatureValid ? 'success' : 'destructive'}>
          {signatureValid ? 'Signature valide' : 'Signature invalide'}
        </Badge>
      ) : null}
    </span>
  );
}
