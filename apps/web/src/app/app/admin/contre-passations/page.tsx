'use client';

import * as React from 'react';
import { AlertTriangle, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/business/page-header';
import { EmptyState } from '@/components/business/empty-state';
import { StatusBadge } from '@/components/business/status-badge';
import { MoneyXaf } from '@/components/business/money-xaf';
import { useReferralPayout } from '@/lib/api/hooks/use-admin-referrals';
import { PAYOUT_STATUS_LABELS } from '@/lib/enum-labels';

/**
 * Le contrat n'expose aucune route pour lister les commissions REVERSED
 * (« une commission payée ne se modifie jamais, elle se contre-passe » —
 * arbitrage n°7) : seule `GET /admin/referral-payouts/{id}` existe, et un
 * `ReferralPayout` ne porte pas le détail des commissions qu'il regroupe.
 * Cet écran documente ce manque et permet, en attendant une route de liste,
 * de consulter un versement précis (pour vérifier son statut avant d'y
 * chercher une contre-passation en base).
 */
export default function ContrePassationsPage() {
  const [payoutId, setPayoutId] = React.useState('');
  const [searchedId, setSearchedId] = React.useState<string | null>(null);
  const { data: payout, isLoading, isError } = useReferralPayout(searchedId);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Contre-passations"
        description="Commissions REVERSED : une commission payée ne se modifie jamais, un remboursement crée une nouvelle ligne REVERSED qui pointe sur l'originale, intacte."
      />

      <Card className="border-warning/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-5 text-warning" aria-hidden="true" />
            Vue partielle
          </CardTitle>
          <CardDescription>
            Aucune route ne liste à ce jour les commissions contre-passées, ni par partenaire ni
            pour l&apos;ensemble de la plateforme. Cet écran ne peut donc pas afficher une liste :
            il permet seulement de consulter le statut d&apos;un versement déjà connu, en attendant
            une route de recherche des commissions REVERSED.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consulter un versement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="payout-lookup">Identifiant du versement</Label>
              <Input
                id="payout-lookup"
                value={payoutId}
                onChange={(e) => setPayoutId(e.target.value)}
                placeholder="refpayout-…"
              />
            </div>
            <Button type="button" onClick={() => setSearchedId(payoutId.trim() || null)}>
              <Search className="mr-2 size-4" aria-hidden="true" />
              Rechercher
            </Button>
          </div>

          {isLoading ? <p className="text-sm text-muted-foreground">Recherche…</p> : null}
          {isError && searchedId ? (
            <EmptyState title="Versement introuvable" description={searchedId} />
          ) : null}
          {payout ? (
            <dl className="grid grid-cols-2 gap-4 rounded-md border border-border p-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Statut</dt>
                <dd>
                  <StatusBadge
                    status={payout.status}
                    labelOverride={PAYOUT_STATUS_LABELS[payout.status]}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Montant</dt>
                <dd>
                  <MoneyXaf amount={payout.amount} />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Commissions incluses</dt>
                <dd>{payout.commissionsCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Motif d&apos;échec</dt>
                <dd>{payout.failureReason ?? '—'}</dd>
              </div>
            </dl>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
