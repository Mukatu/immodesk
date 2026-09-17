'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/business/empty-state';
import { PageHeader } from '@/components/business/page-header';
import { MoneyXaf } from '@/components/business/money-xaf';
import { InspectionStatusBadge } from '@/components/business/inspection-status-badge';
import { ConditionBadge } from '@/components/business/condition-badge';
import { useInspection } from '@/lib/api/hooks/use-inspections';
import { useLease } from '@/lib/api/hooks/use-leases';
import { ApiError } from '@/lib/api/client';
import { INSPECTION_TYPE_LABELS } from '@/lib/enum-labels';
import type { InspectionDetail } from '@/lib/api/types';
import { formatDateFr } from '../_components/format-date-fr';
import { InspectionItemsByRoom } from '../_components/inspection-items-by-room';
import { ItemDamageActions } from '../_components/item-damage-actions';
import { SignInspectionDialog } from '../_components/sign-inspection-dialog';
import { DisputeInspectionDialog } from '../_components/dispute-inspection-dialog';
import { CancelInspectionDialog } from '../_components/cancel-inspection-dialog';
import { InspectionPdfLink } from '../_components/inspection-pdf-link';

/**
 * Actions de statut selon les arbitrages du contrat : un état des lieux SIGNED
 * est figé pour les postes/photos, mais reste contestable (dispute) ; annuler
 * et signer restent possibles tant qu'il n'est pas déjà finalisé ; la
 * retenue/conversion par poste n'a de sens qu'une fois le constat définitif
 * (SIGNED ou DISPUTED, qui ne modifie jamais le constat d'origine).
 */
function renderHeaderActions(inspection: InspectionDetail) {
  const canSign =
    inspection.status === 'DRAFT' ||
    inspection.status === 'IN_PROGRESS' ||
    inspection.status === 'PENDING_SIGNATURE';
  const canCancel = canSign;
  const canDispute = inspection.status === 'SIGNED';

  return (
    <>
      {inspection.reportDocumentId ? <InspectionPdfLink inspectionId={inspection.id} /> : null}
      {canDispute ? <DisputeInspectionDialog inspectionId={inspection.id} /> : null}
      {canSign ? <SignInspectionDialog inspectionId={inspection.id} /> : null}
      {canCancel ? <CancelInspectionDialog inspectionId={inspection.id} /> : null}
    </>
  );
}

export default function InspectionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: inspection, isLoading, error } = useInspection(id);
  const { data: lease } = useLease(inspection?.leaseId ?? null);

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
        title="État des lieux introuvable"
        description="Cet état des lieux n'existe pas ou a été supprimé."
        action={
          <Button asChild variant="outline">
            <Link href="/app/etats-des-lieux">Retour à la liste</Link>
          </Button>
        }
      />
    );
  }

  if (error || !inspection) {
    return (
      <EmptyState
        title="Impossible de charger cet état des lieux"
        description={error instanceof Error ? error.message : undefined}
      />
    );
  }

  const allowItemActions = inspection.status === 'SIGNED' || inspection.status === 'DISPUTED';

  return (
    <div className="space-y-8">
      <PageHeader
        title={inspection.reference}
        description={`${INSPECTION_TYPE_LABELS[inspection.inspectionType]} · ${inspection.unit.code} — ${inspection.property.name}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <InspectionStatusBadge status={inspection.status} />
            {renderHeaderActions(inspection)}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Lot</dt>
              <dd className="text-foreground">{inspection.unit.code}</dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Bail</dt>
              <dd className="text-foreground">{lease?.reference ?? '—'}</dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Date prévue</dt>
              <dd className="text-foreground">{formatDateFr(inspection.scheduledAt)}</dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Date réalisée</dt>
              <dd className="text-foreground">{formatDateFr(inspection.performedAt)}</dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Locataire présent</dt>
              <dd className="text-foreground">
                {inspection.tenantPresent === undefined
                  ? '—'
                  : inspection.tenantPresent
                    ? 'Oui'
                    : 'Non'}
              </dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Bailleur présent</dt>
              <dd className="text-foreground">
                {inspection.landlordPresent === undefined
                  ? '—'
                  : inspection.landlordPresent
                    ? 'Oui'
                    : 'Non'}
              </dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Clés remises</dt>
              <dd className="text-foreground">{inspection.keysHandedCount ?? '—'}</dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-muted-foreground">État général</dt>
              <dd className="text-foreground">
                {inspection.overallCondition ? (
                  <ConditionBadge condition={inspection.overallCondition} />
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Total des dégradations</dt>
              <dd className="text-foreground">
                <MoneyXaf amount={inspection.totalDamageAmount} />
              </dd>
            </div>
            {inspection.notes ? (
              <div className="contents">
                <dt className="font-medium text-muted-foreground">Notes</dt>
                <dd className="text-foreground">{inspection.notes}</dd>
              </div>
            ) : null}
            {inspection.disputeReason ? (
              <div className="contents">
                <dt className="font-medium text-muted-foreground">Motif de contestation</dt>
                <dd className="text-foreground">{inspection.disputeReason}</dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Postes constatés</h2>
        <InspectionItemsByRoom
          items={inspection.items}
          renderActions={
            allowItemActions
              ? (item) => <ItemDamageActions inspectionId={inspection.id} item={item} />
              : undefined
          }
        />
      </div>
    </div>
  );
}
