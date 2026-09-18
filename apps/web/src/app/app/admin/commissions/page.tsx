'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/business/page-header';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { useApproveReferralCommissions } from '@/lib/api/hooks/use-admin-referrals';
import type { ReferralCommissionsApproveResult } from '@/lib/api/types';

/**
 * Aucune route ne liste les commissions ACCRUED d'ensemble des partenaires
 * (seule `/referral-partners/me/commissions` existe, scindée par partenaire) :
 * cet écran ne peut donc pas afficher une file consultable, seulement
 * déclencher la campagne mensuelle d'approbation et son résultat agrégé.
 */
export default function AdminCommissionsPage() {
  const [partnerId, setPartnerId] = React.useState('');
  const [periodEnd, setPeriodEnd] = React.useState('');
  const [lastResult, setLastResult] = React.useState<ReferralCommissionsApproveResult | null>(null);
  const approve = useApproveReferralCommissions();

  async function handleApprove() {
    try {
      const result = await approve.mutateAsync({
        partnerId: partnerId.trim() || undefined,
        periodEnd: periodEnd || undefined,
      });
      setLastResult(result);
      toast.success(`${result.approved} commission(s) approuvée(s).`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Approbation des commissions"
        description="ACCRUED devient APPROVED par campagne mensuelle. Une commission non approuvée n'est jamais versée."
      />

      <Card>
        <CardHeader>
          <CardTitle>Lancer la campagne</CardTitle>
          <CardDescription>
            Laissez les champs vides pour approuver toutes les commissions ACCRUED, toutes échéances
            confondues.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="partner-id">Partenaire (identifiant, optionnel)</Label>
              <Input
                id="partner-id"
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                placeholder="Tous les partenaires"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="period-end">Échéance jusqu&apos;au (optionnel)</Label>
              <Input
                id="period-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>
          <Button type="button" onClick={handleApprove} disabled={approve.isPending}>
            {approve.isPending ? 'Approbation en cours…' : 'Approuver les commissions ACCRUED'}
          </Button>
        </CardContent>
      </Card>

      {lastResult ? (
        <Card>
          <CardHeader>
            <CardTitle>Résultat de la dernière campagne</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Commissions approuvées</p>
              <p className="text-2xl font-semibold">{lastResult.approved}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Retenues par le plafond mensuel</p>
              <p className="text-2xl font-semibold">{lastResult.heldByCap}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
