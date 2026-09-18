'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/business/page-header';
import { EmptyState } from '@/components/business/empty-state';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { useCreateReferralPayouts } from '@/lib/api/hooks/use-admin-referrals';
import { PayoutRow } from './_components/payout-row';

/**
 * Regroupe les commissions APPROVED par partenaire et déclenche le versement
 * Mobile Money (202, traitement asynchrone). Aucune route ne liste les
 * versements existants : seuls ceux créés depuis cet écran, dans cette
 * session, sont suivis ci-dessous via `GET /admin/referral-payouts/{id}`.
 */
export default function AdminVersementsPage() {
  const [partnerIdsInput, setPartnerIdsInput] = React.useState('');
  const [payoutIds, setPayoutIds] = React.useState<string[]>([]);
  const createPayouts = useCreateReferralPayouts();

  async function handleCreate() {
    const partnerIds = partnerIdsInput
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    try {
      const result = await createPayouts.mutateAsync({
        partnerIds: partnerIds.length > 0 ? partnerIds : undefined,
      });
      setPayoutIds((prev) => [...result.payoutIds, ...prev]);
      toast.success(`${result.payoutIds.length} versement(s) lancé(s).`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Versements groupés"
        description="Le seuil minimal du programme conditionne le déclenchement ; un échec exige un motif."
      />

      <Card>
        <CardHeader>
          <CardTitle>Déclencher un versement</CardTitle>
          <CardDescription>
            Identifiants de partenaires séparés par des virgules, ou laissez vide pour tous les
            partenaires ayant des commissions approuvées.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="partner-ids">Partenaires (optionnel)</Label>
            <Input
              id="partner-ids"
              value={partnerIdsInput}
              onChange={(e) => setPartnerIdsInput(e.target.value)}
              placeholder="Tous les partenaires éligibles"
            />
          </div>
          <Button type="button" onClick={handleCreate} disabled={createPayouts.isPending}>
            {createPayouts.isPending ? 'Lancement…' : 'Lancer le versement groupé'}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Versements lancés dans cette session</h3>
        {payoutIds.length === 0 ? (
          <EmptyState title="Aucun versement lancé pour l'instant" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Versement</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Commissions</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Payé le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payoutIds.map((id) => (
                <PayoutRow key={id} payoutId={id} />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
