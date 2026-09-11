'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/business/page-header';
import { EmptyState } from '@/components/business/empty-state';
import { LeaseStatusBadge } from '@/components/business/lease-status-badge';
import { MoneyXaf } from '@/components/business/money-xaf';
import { PartyList } from '@/components/business/party-list';
import { RentRevisionTimeline } from '@/components/business/rent-revision-timeline';
import { useLease } from '@/lib/api/hooks/use-leases';
import { ApiError } from '@/lib/api/client';
import { PAYMENT_METHOD_LABELS, RENT_PERIOD_LABELS } from '@/lib/enum-labels';
import type { LeaseDetail } from '@/lib/api/types';
import { ActivateLeaseDialog } from './_components/activate-lease-dialog';
import { CancelLeaseDialog } from './_components/cancel-lease-dialog';
import { NoticeLeaseDialog } from './_components/notice-lease-dialog';
import { TerminateLeaseDialog } from './_components/terminate-lease-dialog';
import { ReviseRentDialog } from './_components/revise-rent-dialog';
import { AddPartyDialog } from './_components/add-party-dialog';
import { DepositCard } from './_components/deposit-card';
import { ContractCard } from './_components/contract-card';
import { formatDateFr } from './_components/format-date-fr';

function renderHeaderActions(lease: LeaseDetail) {
  const depositHeld = lease.deposit?.heldAmount ?? null;
  if (lease.status === 'DRAFT') {
    return (
      <>
        <ActivateLeaseDialog leaseId={lease.id} defaultMoveInDate={lease.startDate} />
        <CancelLeaseDialog leaseId={lease.id} />
      </>
    );
  }
  if (lease.status === 'ACTIVE') {
    return (
      <>
        <NoticeLeaseDialog leaseId={lease.id} />
        <TerminateLeaseDialog leaseId={lease.id} depositHeldAmount={depositHeld} />
      </>
    );
  }
  if (lease.status === 'NOTICE_GIVEN') {
    return <TerminateLeaseDialog leaseId={lease.id} depositHeldAmount={depositHeld} />;
  }
  return null;
}

export default function BailDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: lease, isLoading, error } = useLease(id);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        title="Bail introuvable"
        description="Ce bail n'existe pas ou a été supprimé."
        action={
          <Button asChild variant="outline">
            <Link href="/app/baux">Retour à la liste des baux</Link>
          </Button>
        }
      />
    );
  }

  if (error || !lease) {
    return (
      <EmptyState
        title="Impossible de charger ce bail"
        description={error instanceof Error ? error.message : undefined}
      />
    );
  }

  const canAddParty = lease.status !== 'TERMINATED' && lease.status !== 'CANCELLED';

  return (
    <div className="space-y-8">
      <PageHeader
        title={lease.reference ?? 'Bail brouillon'}
        description={`${lease.property.name} · ${lease.unit.code} · ${lease.primaryTenant.displayName}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <LeaseStatusBadge status={lease.status} />
            {renderHeaderActions(lease)}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Loyer</dt>
              <dd className="text-foreground">
                <MoneyXaf amount={lease.rentAmount} />
              </dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Charges</dt>
              <dd className="text-foreground">
                <MoneyXaf amount={lease.chargesAmount ?? 0} />
              </dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Périodicité</dt>
              <dd className="text-foreground">
                {lease.rentPeriod ? RENT_PERIOD_LABELS[lease.rentPeriod] : '—'}
              </dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Dépôt de garantie</dt>
              <dd className="text-foreground">
                {lease.depositAmount !== undefined && lease.depositAmount !== null ? (
                  <MoneyXaf amount={lease.depositAmount} />
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Jour d&apos;échéance</dt>
              <dd className="text-foreground">Le {lease.paymentDueDay}</dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Début</dt>
              <dd className="text-foreground">{formatDateFr(lease.startDate)}</dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Fin</dt>
              <dd className="text-foreground">
                {lease.endDate ? formatDateFr(lease.endDate) : 'Indéterminée'}
              </dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Mode de paiement</dt>
              <dd className="text-foreground">
                {lease.preferredPaymentMethod
                  ? PAYMENT_METHOD_LABELS[lease.preferredPaymentMethod]
                  : '—'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Parties</CardTitle>
          {canAddParty ? (
            <AddPartyDialog
              leaseId={lease.id}
              primaryTenantId={lease.primaryTenantId}
              existingParties={lease.parties}
            />
          ) : null}
        </CardHeader>
        <CardContent>
          <PartyList parties={lease.parties} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Révisions de loyer</CardTitle>
          {lease.status === 'ACTIVE' ? <ReviseRentDialog leaseId={lease.id} /> : null}
        </CardHeader>
        <CardContent>
          <RentRevisionTimeline revisions={lease.rentRevisions} />
        </CardContent>
      </Card>

      <DepositCard deposit={lease.deposit} />

      <ContractCard leaseId={lease.id} documents={lease.documents} />
    </div>
  );
}
