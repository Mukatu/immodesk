'use client';

import { Landmark } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeclarationStatusBadge } from '@/components/business/declaration-status-badge';
import { EmptyState } from '@/components/business/empty-state';
import { MoneyXaf } from '@/components/business/money-xaf';
import { useTenantBankTransferDeclarations } from '@/lib/api/hooks/use-tenant-portal';
import { DeclareTransferForm } from './_components/declare-transfer-form';

function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

/** Déclaration de virement bancaire par le locataire, avec historique de ses déclarations. */
export default function VirementLocatairePage() {
  const { data, isLoading, isError } = useTenantBankTransferDeclarations({ limit: 20 });
  const declarations = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Déclarer un virement</h1>
        <p className="text-sm text-muted-foreground">
          Signalez un virement bancaire déjà effectué ; la validation reste réservée à votre
          gestionnaire.
        </p>
      </div>

      <DeclareTransferForm />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique de vos déclarations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isError ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              Impossible de charger vos déclarations pour le moment.
            </p>
          ) : null}

          {!isLoading && declarations.length === 0 && !isError ? (
            <EmptyState
              icon={Landmark}
              title="Aucune déclaration"
              description="Vos déclarations de virement apparaîtront ici."
            />
          ) : null}

          {declarations.map((declaration) => (
            <div
              key={declaration.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3 text-sm"
            >
              <div>
                <p className="font-medium">{formatDate(declaration.transferDate)}</p>
                <p className="text-muted-foreground">
                  {declaration.transferReference ?? 'Sans référence'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <MoneyXaf amount={declaration.declaredAmount} />
                <DeclarationStatusBadge status={declaration.status} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
