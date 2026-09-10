import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OccupancyBadge } from '@/components/business/occupancy-badge';
import type { PropertySummary } from '@/lib/api/types';

export interface PropertyCardProps {
  property: PropertySummary;
}

/** Carte immeuble pour la vue grille : nom, localisation, bailleur, occupation. */
export function PropertyCard({ property }: PropertyCardProps) {
  const location = [property.district, property.city].filter(Boolean).join(', ');

  return (
    <Card className="transition-colors hover:border-primary/60">
      <CardHeader>
        <CardTitle className="text-base">
          <Link href={`/app/immeubles/${property.id}`} className="hover:underline">
            {property.name}
          </Link>
        </CardTitle>
        {location ? <CardDescription>{location}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <Link
          href={`/app/bailleurs/${property.landlord.id}`}
          className="truncate text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          {property.landlord.displayName}
        </Link>
        <OccupancyBadge occupancy={property.occupancy} />
      </CardContent>
    </Card>
  );
}
