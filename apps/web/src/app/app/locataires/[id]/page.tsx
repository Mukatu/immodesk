'use client';

import { useParams } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/business/page-header';
import { EmptyState } from '@/components/business/empty-state';
import { DocumentList, DocumentUploader } from '@/components/business/document-uploader';
import { useTenant } from '@/lib/api/hooks/use-tenants';
import { TenantIdentitySection } from './_components/identity-section';
import { GuarantorsSection } from './_components/guarantors-section';
import { ContactChannelsSection } from './_components/contact-channels-section';

export default function LocataireDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: tenant, isLoading } = useTenant(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <EmptyState
        title="Locataire introuvable"
        description="Ce locataire n’existe pas ou a été supprimé."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={tenant.displayName} description="Fiche locataire" />

      <TenantIdentitySection tenant={tenant} />

      <GuarantorsSection tenantId={tenant.id} guarantors={tenant.guarantors} />

      <ContactChannelsSection tenantId={tenant.id} />

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DocumentUploader
            relatedEntityType="tenant"
            relatedEntityId={tenant.id}
            kind="ID_DOCUMENT"
          />
          <DocumentList relatedEntityType="tenant" relatedEntityId={tenant.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Aucun historique pour le moment"
            description="Les baux et paiements apparaîtront ici dans une prochaine phase."
          />
        </CardContent>
      </Card>
    </div>
  );
}
