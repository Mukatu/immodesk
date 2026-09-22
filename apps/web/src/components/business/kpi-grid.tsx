import { cn } from '@/lib/utils';

/** Grille de tuiles KPI : colonnes auto-adaptatives d'au moins 170px chacune. */
export function KpiGrid({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4', className)}
      {...props}
    />
  );
}
