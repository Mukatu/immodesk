'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/business/empty-state';
import { MoneyXaf } from '@/components/business/money-xaf';
import { Skeleton } from '@/components/ui/skeleton';
import { PENALTY_BASIS_LABELS } from '@/lib/enum-labels';
import { usePenaltyRules, useCreatePenaltyRule } from '@/lib/api/hooks/use-penalty-rules';
import type { PenaltyRule } from '@/lib/api/types';
import { PenaltyRuleDialog } from './penalty-rule-dialog';

function rateLabel(rule: PenaltyRule): React.ReactNode {
  if (rule.basis === 'FLAT_AMOUNT' || rule.basis === 'FLAT_AMOUNT_PER_DAY') {
    return <MoneyXaf amount={rule.flatAmount ?? 0} />;
  }
  return `${((rule.rateBps ?? 0) / 100).toLocaleString('fr-FR')} %`;
}

/** Liste des règles de pénalité de l'organisation, avec création/édition en dialog. */
export function PenaltyRulesSection() {
  const { data, isLoading } = usePenaltyRules();
  const createRule = useCreatePenaltyRule();
  const [editing, setEditing] = React.useState<PenaltyRule | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const rules = data?.items ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Règles de pénalité</CardTitle>
          <CardDescription>
            Appliquées aux baux en retard selon les paramètres ci-dessus.
          </CardDescription>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          Nouvelle règle
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : rules.length === 0 ? (
          <EmptyState title="Aucune règle" description="Créez une règle de pénalité de retard." />
        ) : (
          <ul className="space-y-2">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{rule.name}</span>
                    {rule.isDefault ? <Badge variant="secondary">Par défaut</Badge> : null}
                    {!rule.isActive ? <Badge variant="outline">Inactive</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {PENALTY_BASIS_LABELS[rule.basis]} — {rateLabel(rule)}
                    {rule.graceDays ? ` — grâce ${rule.graceDays} j` : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(rule);
                    setDialogOpen(true);
                  }}
                >
                  Modifier
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <PenaltyRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rule={editing}
        onCreate={async (body) => {
          await createRule.mutateAsync(body);
          toast.success('Règle créée.');
        }}
      />
    </Card>
  );
}
