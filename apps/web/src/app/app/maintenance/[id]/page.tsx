'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/business/page-header';
import { EmptyState } from '@/components/business/empty-state';
import { MoneyXaf } from '@/components/business/money-xaf';
import { PriorityBadge } from '@/components/business/priority-badge';
import { MaintenanceStatusBadge } from '@/components/business/maintenance-status-badge';
import { useMaintenanceRequest } from '@/lib/api/hooks/use-maintenance';
import { useMembers } from '@/lib/api/hooks/use-members';
import { useAuth } from '@/lib/auth/auth-context';
import { MAINTENANCE_REPORTER_LABELS } from '@/lib/enum-labels';
import { formatDateFr } from '../_components/format-date-fr';
import { MaintenanceDueIndicator } from '../_components/maintenance-due-indicator';
import { MaintenanceUpdateEntry } from '../_components/maintenance-update-entry';
import { AcknowledgeButton } from './_components/acknowledge-button';
import { AssignDialog } from './_components/assign-dialog';
import { AddUpdateDialog } from './_components/add-update-dialog';
import { ResolveDialog } from './_components/resolve-dialog';
import { CloseButton } from './_components/close-button';
import { RejectDialog } from './_components/reject-dialog';

/**
 * Statuts pour lesquels chaque action est proposée, dérivés de l'ordre du
 * tableau des étapes du contrat phase 8 : une action n'apparaît que si le
 * statut courant permet la transition qu'elle produit.
 */
const CAN_ACKNOWLEDGE = new Set(['OPEN']);
const CAN_ASSIGN = new Set(['ACKNOWLEDGED']);
const CAN_ADD_UPDATE = new Set(['ASSIGNED', 'IN_PROGRESS', 'ON_HOLD']);
const CAN_RESOLVE = new Set(['ASSIGNED', 'IN_PROGRESS', 'ON_HOLD']);
const CAN_CLOSE = new Set(['RESOLVED']);
const CAN_REJECT = new Set(['OPEN', 'ACKNOWLEDGED']);

export default function MaintenanceDetailPage() {
  const params = useParams<{ id: string }>();
  const requestId = params.id;
  const { currentOrganizationId } = useAuth();
  const { data: request, isLoading } = useMaintenanceRequest(requestId);
  const { data: members } = useMembers(currentOrganizationId);
  const [error, setError] = React.useState<string | null>(null);
  const now = new Date();

  const assigneeName = React.useMemo(() => {
    if (!request?.assignedToUserId) return 'Non affectée';
    const member = members?.items.find((m) => m.user.id === request.assignedToUserId);
    return member?.user.fullName ?? '—';
  }, [members, request?.assignedToUserId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!request) {
    return <EmptyState title="Demande introuvable" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={request.reference}
        description={request.title}
        actions={
          <div className="flex items-center gap-2">
            <PriorityBadge priority={request.priority} />
            <MaintenanceStatusBadge status={request.status} />
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {CAN_ACKNOWLEDGE.has(request.status) && (
          <AcknowledgeButton requestId={request.id} onError={setError} />
        )}
        {CAN_ASSIGN.has(request.status) && <AssignDialog requestId={request.id} />}
        {CAN_ADD_UPDATE.has(request.status) && <AddUpdateDialog requestId={request.id} />}
        {CAN_RESOLVE.has(request.status) && <ResolveDialog requestId={request.id} />}
        {CAN_CLOSE.has(request.status) && <CloseButton requestId={request.id} onError={setError} />}
        {CAN_REJECT.has(request.status) && <RejectDialog requestId={request.id} />}
      </div>
      {error ? (
        <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <p>
            Lot : <span className="font-medium">{request.unit?.code ?? '—'}</span>
          </p>
          <p>
            Immeuble : <span className="font-medium">{request.property.name}</span>
          </p>
          <p>
            Origine :{' '}
            <span className="font-medium">{MAINTENANCE_REPORTER_LABELS[request.reporterType]}</span>
          </p>
          <p>
            Signalée le : <span className="font-medium">{formatDateFr(request.reportedAt)}</span>
          </p>
          <p className="flex items-center gap-2">
            Échéance cible :
            <MaintenanceDueIndicator
              slaDueAt={request.slaDueAt}
              status={request.status}
              now={now}
            />
          </p>
          <p>
            Personne affectée : <span className="font-medium">{assigneeName}</span>
          </p>
          <p>
            Montant estimé : <MoneyXaf amount={request.estimatedAmount} />
          </p>
          <p>
            Montant réel : <MoneyXaf amount={request.actualAmount} />
          </p>
          {request.inspectionId ? (
            <p className="sm:col-span-2">
              <Link
                href={`/app/etats-des-lieux/${request.inspectionId}`}
                className="font-medium text-primary hover:underline"
              >
                Voir l&apos;état des lieux d&apos;origine
              </Link>
            </p>
          ) : null}
          {request.rejectionReason ? (
            <p className="sm:col-span-2 text-destructive">
              Motif du refus : <span className="font-medium">{request.rejectionReason}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">{request.description}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fil chronologique ({request.updates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {request.updates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune mise à jour pour l&apos;instant.</p>
          ) : (
            <ol className="space-y-4 border-l border-border pl-4">
              {[...request.updates]
                .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
                .map((update) => (
                  <MaintenanceUpdateEntry key={update.id} update={update} />
                ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
