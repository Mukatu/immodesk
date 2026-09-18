import Link from 'next/link';
import { AlertTriangle, HandCoins, RotateCcw, Wallet } from 'lucide-react';

import { PageHeader } from '@/components/business/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const SECTIONS = [
  {
    href: '/app/admin/commissions',
    icon: HandCoins,
    title: 'Approbation des commissions',
    description: "Campagne mensuelle : passe les commissions ACCRUED d'un partenaire en APPROVED.",
  },
  {
    href: '/app/admin/versements',
    icon: Wallet,
    title: 'Versements groupés',
    description:
      'Regroupe les commissions APPROVED par partenaire et déclenche le versement Mobile Money.',
  },
  {
    href: '/app/admin/abonnements-a-risque',
    icon: AlertTriangle,
    title: 'Abonnements à risque',
    description: 'Organisations en impayé (PAST_DUE) ou suspendues (SUSPENDED).',
  },
  {
    href: '/app/admin/contre-passations',
    icon: RotateCcw,
    title: 'Contre-passations',
    description:
      'Commissions REVERSED : une commission payée ne se modifie jamais, elle se contre-passe.',
  },
];

export default function AdminOverviewPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Back-office plateforme"
        description="Apport d'affaires et santé des abonnements, tous partenaires et organisations confondus."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTIONS.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <Icon className="mb-2 size-6 text-primary" aria-hidden="true" />
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
