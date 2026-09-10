import { Badge, type BadgeProps } from '@/components/ui/badge';

type StatusVariant = NonNullable<BadgeProps['variant']>;

interface StatusConfig {
  label: string;
  variant: StatusVariant;
}

/**
 * Mapping des statuts métier connus en phase 0 (organisation, invitation, membre)
 * vers un libellé fr-CG et une couleur. La couleur n'est jamais le seul porteur
 * d'information : le libellé texte est toujours présent.
 */
const STATUS_MAP: Record<string, StatusConfig> = {
  ACTIVE: { label: 'Actif', variant: 'success' },
  SUSPENDED: { label: 'Suspendu', variant: 'warning' },
  PENDING: { label: 'En attente', variant: 'secondary' },
  ACCEPTED: { label: 'Acceptée', variant: 'success' },
  EXPIRED: { label: 'Expirée', variant: 'outline' },
  REVOKED: { label: 'Révoquée', variant: 'destructive' },
};

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: string;
  /** Surcharge ponctuelle du mapping par défaut. */
  labelOverride?: string;
  variantOverride?: StatusVariant;
}

export function StatusBadge({
  status,
  labelOverride,
  variantOverride,
  ...props
}: StatusBadgeProps) {
  const config = STATUS_MAP[status];
  const label = labelOverride ?? config?.label ?? status;
  const variant = variantOverride ?? config?.variant ?? 'outline';

  return (
    <Badge variant={variant} {...props}>
      {label}
    </Badge>
  );
}
