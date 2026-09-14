import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toE164Congo } from '@/lib/phone';
import { MOMO_PROVIDER_LABELS } from '@/lib/enum-labels';

export interface OperatorBadgeProps {
  /** Numéro Mobile Money, dans un format libre (+242, 242 ou local). */
  msisdn: string;
  className?: string;
}

/**
 * Déduit l'opérateur Mobile Money congolais du préfixe du numéro : 06 → MTN
 * Mobile Money, 05 → Airtel Money (contrat phase 4, arbitrage de détection par
 * préfixe MSISDN). Réutilise `toE164Congo` (lib/phone.ts) pour normaliser les
 * formats +242, 242 ou local avant de lire le préfixe.
 */
export function OperatorBadge({ msisdn, className }: OperatorBadgeProps) {
  const e164 = toE164Congo(msisdn);
  const local = e164?.slice(4) ?? '';

  if (local.startsWith('06')) {
    return (
      <Badge variant="outline" className={cn(className)}>
        {MOMO_PROVIDER_LABELS.MTN_MOMO}
      </Badge>
    );
  }

  if (local.startsWith('05')) {
    return (
      <Badge variant="outline" className={cn(className)}>
        {MOMO_PROVIDER_LABELS.AIRTEL_MONEY}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn(className)}>
      Opérateur inconnu
    </Badge>
  );
}
