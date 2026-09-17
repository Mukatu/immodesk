'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/business/empty-state';
import { MoneyXaf } from '@/components/business/money-xaf';
import { PageHeader } from '@/components/business/page-header';
import { useDunningRules } from '@/lib/api/hooks/use-dunning-rules';
import { useAuth } from '@/lib/auth/auth-context';
import { DUNNING_TRIGGER_LABELS, NOTIFICATION_CHANNEL_LABELS } from '@/lib/enum-labels';
import { usePenaltyRules } from '@/lib/api/hooks/use-penalty-rules';
import type { DunningRule } from '@/lib/api/types';
import { DunningStepDialog } from './_components/dunning-step-dialog';
import { TriggerScanDialog } from './_components/trigger-scan-dialog';
import { StepActivateButton } from './_components/step-activate-button';

export default function RelancesPage() {
  const { currentOrganizationId } = useAuth();
  const { data, isLoading } = useDunningRules();
  const { data: penaltyRulesData } = usePenaltyRules();
  const [editing, setEditing] = React.useState<DunningRule | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const rules = React.useMemo(
    () => [...(data?.items ?? [])].sort((a, b) => a.stepOrder - b.stepOrder),
    [data],
  );
  const penaltyRuleName = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const pr of penaltyRulesData?.items ?? []) map.set(pr.id, pr.name);
    return map;
  }, [penaltyRulesData]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relances"
        description="Paliers de relance des impayés : déclencheur, canal, pénalité et heure d'envoi."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <TriggerScanDialog organizationId={currentOrganizationId} />
            <Button
              type="button"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              Nouveau palier
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : rules.length === 0 ? (
        <EmptyState title="Aucun palier" description="Créez le premier palier de relance." />
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Rang {rule.stepOrder}</Badge>
                    <span className="font-medium">{rule.name}</span>
                    {!rule.isActive ? <Badge variant="outline">Inactif</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {DUNNING_TRIGGER_LABELS[rule.triggerType ?? 'DAYS_AFTER_DUE']} —{' '}
                    {rule.offsetDays} j · Canal{' '}
                    {NOTIFICATION_CHANNEL_LABELS[rule.channel ?? 'WHATSAPP']}
                    {rule.fallbackChannel
                      ? ` (repli ${NOTIFICATION_CHANNEL_LABELS[rule.fallbackChannel]})`
                      : ''}
                    · Solde min. <MoneyXaf amount={rule.minBalanceAmount ?? 0} /> · Envoi{' '}
                    {rule.sendHourLocal}h
                  </p>
                  {rule.applyPenalty ? (
                    <p className="text-xs text-muted-foreground">
                      Pénalité :{' '}
                      {rule.penaltyRuleId
                        ? (penaltyRuleName.get(rule.penaltyRuleId) ?? 'règle inconnue')
                        : 'aucune règle sélectionnée'}
                    </p>
                  ) : null}
                  {rule.escalateToLegal ? (
                    <p className="text-xs text-muted-foreground">Escalade au garant activée.</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
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
                  <StepActivateButton rule={rule} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DunningStepDialog open={dialogOpen} onOpenChange={setDialogOpen} rule={editing} />
    </div>
  );
}
