'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/business/page-header';
import { EmptyState } from '@/components/business/empty-state';
import { DocumentList, DocumentUploader } from '@/components/business/document-uploader';
import { LeaseStatusBadge } from '@/components/business/lease-status-badge';
import { MoneyXaf } from '@/components/business/money-xaf';
import { useTenant } from '@/lib/api/hooks/use-tenants';
import { useLeases } from '@/lib/api/hooks/use-leases';
import { TenantIdentitySection } from './_components/identity-section';
import { GuarantorsSection } from './_components/guarantors-section';
import { ContactChannelsSection } from './_components/contact-channels-section';
import { InvoicesTab } from './_components/invoices-tab';
import { PaymentsTab } from './_components/payments-tab';
import { CreditsTab } from './_components/credits-tab';
import { StatementTab } from './_components/statement-tab';

const ACCOUNTING_TABS = [
  { key: 'factures', label: 'Factures' },
  { key: 'paiements', label: 'Paiements' },
  { key: 'credits', label: 'Crédits' },
  { key: 'releve', label: 'Relevé de compte' },
] as const;

type AccountingTab = (typeof ACCOUNTING_TABS)[number]['key'];

export default function LocataireDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: tenant, isLoading } = useTenant(id);
  const { data: leases } = useLeases({ tenantId: id, limit: 50 });
  const [accountingTab, setAccountingTab] = React.useState<AccountingTab>('factures');

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
          <CardTitle>Baux</CardTitle>
        </CardHeader>
        <CardContent>
          {leases && leases.items.length > 0 ? (
            <ul className="space-y-2">
              {leases.items.map((lease) => (
                <li
                  key={lease.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
                >
                  <Link
                    href={`/app/baux/${lease.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {lease.unit.code} — {lease.property.name}
                  </Link>
                  <div className="flex items-center gap-3">
                    <MoneyXaf amount={lease.rentAmount} />
                    <LeaseStatusBadge status={lease.status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Aucun bail"
              description="Ce locataire n'a pas encore de bail associé."
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comptabilité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="inline-flex flex-wrap items-center gap-1 rounded-md border border-border p-1"
            role="group"
            aria-label="Onglets de comptabilité"
          >
            {ACCOUNTING_TABS.map((tab) => (
              <Button
                key={tab.key}
                type="button"
                size="sm"
                variant={accountingTab === tab.key ? 'default' : 'ghost'}
                aria-pressed={accountingTab === tab.key}
                onClick={() => setAccountingTab(tab.key)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
          {accountingTab === 'factures' ? <InvoicesTab tenantId={tenant.id} /> : null}
          {accountingTab === 'paiements' ? <PaymentsTab tenantId={tenant.id} /> : null}
          {accountingTab === 'credits' ? <CreditsTab tenantId={tenant.id} /> : null}
          {accountingTab === 'releve' ? <StatementTab tenantId={tenant.id} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
