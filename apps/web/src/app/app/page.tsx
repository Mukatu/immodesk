'use client';

import Link from 'next/link';
import { ClipboardList, Settings, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/business/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth/auth-context';

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
    description: 'La gestion du patrimoine et des baux arrive dans une prochaine phase.',
    href: '/app/parametres',
    cta: 'Bientôt disponible',
  },
];

export default function DashboardPage() {
  const { status, currentOrganization } = useAuth();

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
    </div>
  );
}
