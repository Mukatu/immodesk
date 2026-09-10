'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  ClipboardList,
  DoorOpen,
  Percent,
  Settings,
  UserPlus,
  Users2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/business/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth/auth-context';
import { useProperties } from '@/lib/api/hooks/use-properties';
import { useUnits } from '@/lib/api/hooks/use-units';
import { useTenants } from '@/lib/api/hooks/use-tenants';

const NEXT_STEPS = [
  {
    icon: Settings,
    title: 'Compléter les paramètres',
    description: 'Jour d’échéance des loyers, fuseau horaire, informations de l’organisation.',
    href: '/app/parametres',
    cta: 'Ouvrir les paramètres',
  },
  {
    icon: UserPlus,
    title: 'Inviter votre équipe',
    description: 'Ajoutez vos collègues et attribuez-leur un rôle adapté.',
    href: '/app/equipe',
    cta: 'Gérer l’équipe',
  },
  {
    icon: ClipboardList,
    title: 'Ajouter vos premiers biens',
    description: 'Renseignez vos immeubles et lots pour suivre votre patrimoine.',
    href: '/app/immeubles',
    cta: 'Ajouter un immeuble',
  },
];

/**
 * Plafond de page utilisé pour les tuiles du tableau de bord. Le contrat
 * d'API ne renvoie pas de total global (pagination par curseur, `pageInfo`
 * sans compteur) : on charge donc la plus grande page autorisée (100, cf.
 * MAX_PAGE_LIMIT côté API) et on affiche un compte honnête, suffixé de
 * « + » via `hasNextPage` quand il reste des éléments au-delà de cette page.
 */
const DASHBOARD_PAGE_LIMIT = 100;

function pluralize(count: number, singular: string, plural: string): string {
  return count > 1 ? plural : singular;
}

function formatApproxCount(
  count: number,
  hasMore: boolean,
  singular: string,
  plural: string,
): string {
  const noun = pluralize(count, singular, plural);
  return hasMore ? `${count}+ ${noun}` : `${count} ${noun}`;
}

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  isLoading: boolean;
  href?: string;
  linkLabel?: string;
}

function KpiCard({ icon: Icon, label, value, isLoading, href, linkLabel }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Icon className="mb-2 size-5 text-primary" aria-hidden="true" />
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <p className="text-3xl font-semibold">{value}</p>
        )}
        {href ? (
          <Button asChild variant="link" size="sm" className="h-auto px-0">
            <Link href={href}>{linkLabel ?? 'Voir tout'}</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { status, currentOrganization } = useAuth();
  const propertiesQuery = useProperties({ limit: DASHBOARD_PAGE_LIMIT });
  const unitsQuery = useUnits({ limit: DASHBOARD_PAGE_LIMIT });
  const tenantsQuery = useTenants({ limit: DASHBOARD_PAGE_LIMIT });

  const properties = propertiesQuery.data?.items ?? [];
  const propertiesValue = formatApproxCount(
    properties.length,
    propertiesQuery.data?.pageInfo.hasNextPage ?? false,
    'immeuble',
    'immeubles',
  );

  const unitsValue = formatApproxCount(
    unitsQuery.data?.items.length ?? 0,
    unitsQuery.data?.pageInfo.hasNextPage ?? false,
    'lot',
    'lots',
  );

  const tenantsValue = formatApproxCount(
    tenantsQuery.data?.items.length ?? 0,
    tenantsQuery.data?.pageInfo.hasNextPage ?? false,
    'locataire',
    'locataires',
  );

  // Moyenne pondérée par le nombre de lots de chaque immeuble chargé (page
  // courante uniquement : voir la note sur DASHBOARD_PAGE_LIMIT ci-dessus).
  const occupancyTotals = properties.reduce(
    (acc, property) => ({
      units: acc.units + property.occupancy.unitsCount,
      occupied: acc.occupied + property.occupancy.occupiedCount,
    }),
    { units: 0, occupied: 0 },
  );
  const occupancyValue =
    occupancyTotals.units > 0
      ? `${Math.round((occupancyTotals.occupied / occupancyTotals.units) * 100)} % occupé`
      : '—';

  return (
    <div className="space-y-8">
      <PageHeader
        title={
          currentOrganization
            ? `Bienvenue, ${currentOrganization.organization.legalName}`
            : 'Bienvenue sur Immodesk'
        }
        description="Votre tableau de bord est prêt. Voici quelques étapes pour bien démarrer."
      />

      <section aria-labelledby="apercu-titre" className="space-y-4">
        <h2 id="apercu-titre" className="text-lg font-semibold">
          Aperçu
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={Building2}
            label="Immeubles"
            value={propertiesValue}
            isLoading={propertiesQuery.isLoading}
            href="/app/immeubles"
            linkLabel="Voir tous les immeubles"
          />
          <KpiCard
            icon={DoorOpen}
            label="Lots"
            value={unitsValue}
            isLoading={unitsQuery.isLoading}
          />
          <KpiCard
            icon={Percent}
            label="Taux d'occupation"
            value={occupancyValue}
            isLoading={propertiesQuery.isLoading}
          />
          <KpiCard
            icon={Users2}
            label="Locataires"
            value={tenantsValue}
            isLoading={tenantsQuery.isLoading}
            href="/app/locataires"
            linkLabel="Voir tous les locataires"
          />
        </div>
      </section>

      <section aria-labelledby="prochaines-etapes-titre" className="space-y-4">
        <h2 id="prochaines-etapes-titre" className="text-lg font-semibold">
          Pour aller plus loin
        </h2>
        {status === 'loading' ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {NEXT_STEPS.map(({ icon: Icon, title, description, href, cta }) => (
              <Card key={title}>
                <CardHeader>
                  <Icon className="mb-2 size-5 text-primary" aria-hidden="true" />
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" size="sm">
                    <Link href={href}>{cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
