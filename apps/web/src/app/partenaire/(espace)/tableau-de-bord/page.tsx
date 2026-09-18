'use client';

import * as React from 'react';

import { PageHeader } from '@/components/business/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/business/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiError } from '@/lib/api/errors';
import { useReferralPartnerMe } from '@/lib/api/hooks/use-referral';
import { ReferralsSection } from './_components/referrals-section';
import { CommissionsSection } from './_components/commissions-section';

export default function TableauDeBordPartenairePage() {
  const [tab, setTab] = React.useState('filleuls');
  const { data: partner, isLoading, isError, error } = useReferralPartnerMe();
  const notRegistered = isError && error instanceof ApiError && error.status === 404;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (notRegistered || !partner) {
    return (
      <EmptyState
        title="Vous n'êtes pas encore inscrit comme partenaire"
        description="Inscrivez-vous d'abord depuis la page d'accueil de l'espace partenaire."
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tableau de bord partenaire"
        description={`Code ${partner.code} — suivez vos filleuls et vos commissions.`}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="filleuls">Filleuls</TabsTrigger>
          <TabsTrigger value="commissions">Commissions et versements</TabsTrigger>
        </TabsList>
        <TabsContent value="filleuls">
          <ReferralsSection />
        </TabsContent>
        <TabsContent value="commissions">
          <CommissionsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
