import { Globe } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface DiasporaBadgeProps {
  /** `landlords.country_code` différent de `CG` (dérivé, cf. contrat phase 7). */
  isDiaspora: boolean;
  className?: string;
}

/** Signale un bailleur en diaspora (hors Congo-Brazzaville). Rien n'est affiché sinon. */
export function DiasporaBadge({ isDiaspora, className }: DiasporaBadgeProps) {
  if (!isDiaspora) return null;
  return (
    <Badge variant="secondary" className={cn('gap-1', className)}>
      <Globe className="size-3" aria-hidden="true" />
      Diaspora
    </Badge>
  );
}
