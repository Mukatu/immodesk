'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/business/empty-state';
import { StatusBadge } from '@/components/business/status-badge';
import { useReferralPartnerReferrals } from '@/lib/api/hooks/use-referral';
import { REFERRAL_SOURCE_LABELS, REFERRAL_STATUS_LABELS } from '@/lib/enum-labels';
import type { ReferralStatus } from '@/lib/api/types';
import { RegisterPropertyDialog } from './register-property-dialog';

const REFERRAL_STATUS_VARIANT: Record<
  ReferralStatus,
  'success' | 'secondary' | 'warning' | 'outline'
> = {
  PENDING: 'secondary',
  QUALIFIED: 'warning',
  ACTIVE: 'success',
  EXPIRED: 'outline',
  CANCELLED: 'outline',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-CG');
}

export function ReferralsSection() {
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const { data, isLoading } = useReferralPartnerReferrals({ limit: 20, cursor });
  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Un filleul se qualifie (PENDING → QUALIFIED → ACTIVE) au premier paiement réel de son
          abonnement, jamais à l&apos;inscription.
        </p>
        <RegisterPropertyDialog />
      </div>

      {isLoading ? <Skeleton className="h-48 w-full" /> : null}

      {!isLoading && items.length === 0 ? (
        <EmptyState
          title="Aucun filleul pour l'instant"
          description="Partagez votre code ou apportez directement un bien pour démarrer."
        />
      ) : null}

      {!isLoading && items.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organisation filleule</TableHead>
              <TableHead>Origine</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Qualifié le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((referral) => (
              <TableRow key={referral.id}>
                <TableCell className="font-medium">{referral.referredOrganizationName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {REFERRAL_SOURCE_LABELS[referral.source]}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={referral.status}
                    labelOverride={REFERRAL_STATUS_LABELS[referral.status]}
                    variantOverride={REFERRAL_STATUS_VARIANT[referral.status]}
                  />
                </TableCell>
                <TableCell>{formatDate(referral.qualifiedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      {data?.pageInfo.hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setCursor(data.pageInfo.nextCursor ?? undefined)}
        >
          Voir plus
        </Button>
      ) : null}
    </div>
  );
}
