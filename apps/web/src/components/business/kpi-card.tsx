import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface KpiCardProps {
  icon?: LucideIcon;
  /** Couleur de l'icône (ex. `text-destructive` pour un indicateur d'alerte). Défaut : `text-primary`. */
  iconClassName?: string;
  label: string;
  /** Valeur mise en avant. Pour un montant, passer un `<MoneyXaf />` (déjà `tabular-nums`). */
  value: React.ReactNode;
  isLoading?: boolean;
  href?: string;
  linkLabel?: string;
  className?: string;
}

/**
 * Tuile d'indicateur clé (KPI) : icône, libellé, valeur proéminente à chiffres alignés
 * (`tabular-nums`), et un lien optionnel vers la vue détaillée. Destinée à être posée
 * dans une `KpiGrid`.
 */
export function KpiCard({
  icon: Icon,
  iconClassName,
  label,
  value,
  isLoading = false,
  href,
  linkLabel,
  className,
}: KpiCardProps) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-2">
        {Icon ? (
          <Icon className={cn('mb-2 size-5 text-primary', iconClassName)} aria-hidden="true" />
        ) : null}
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between space-y-2">
        {isLoading ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <div className="text-3xl font-semibold tabular-nums">{value}</div>
        )}
        {href ? (
          <Button asChild variant="link" size="sm" className="h-auto w-fit px-0">
            <Link href={href}>{linkLabel ?? 'Voir tout'}</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
