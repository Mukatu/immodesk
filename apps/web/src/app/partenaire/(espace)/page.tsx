'use client';

import { PageHeader } from '@/components/business/page-header';
import { EmptyState } from '@/components/business/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api/errors';
import { useReferralPartnerMe } from '@/lib/api/hooks/use-referral';
import { PartnerRegistrationForm } from './_components/partner-registration-form';
import { PartnerShareCard } from './_components/partner-share-card';

export default function DevenirPartenairePage() {
  const { data: partner, isLoading, isError, error } = useReferralPartnerMe();
  const notRegisteredYet = isError && error instanceof ApiError && error.status === 404;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Apport d'affaires"
        description="Percevez une commission en apportant de nouvelles agences ou de nouveaux bailleurs à Immodesk."
      />

      {isLoading ? <Skeleton className="h-64 w-full" /> : null}

      {!isLoading && notRegisteredYet ? <PartnerRegistrationForm /> : null}

      {!isLoading && partner ? <PartnerShareCard partner={partner} /> : null}

      {!isLoading && isError && !notRegisteredYet ? (
        <EmptyState
          title="Impossible de charger votre profil partenaire"
          description="Veuillez réessayer dans quelques instants."
        />
      ) : null}
    </div>
  );
}
