'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoneyXaf } from '@/components/business/money-xaf';
import { useSimulatePenaltyRule } from '@/lib/api/hooks/use-penalty-rules';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import type { PenaltyRule, SimulatePenaltyResult } from '@/lib/api/types';
import { PenaltySimulatorResult } from './penalty-simulator-result';

export interface PenaltySimulatorProps {
  rules: PenaltyRule[];
}

/**
 * Simulateur de pénalité (tranche 3) : saisie d'un solde et d'un nombre de
 * jours de retard, appel de `POST /penalty-rules/{id}/simulate` (aucune
 * écriture), affichage du montant calculé, du plafond appliqué le cas échéant
 * et du nombre de périodes.
 */
export function PenaltySimulator({ rules }: PenaltySimulatorProps) {
  const activeRules = React.useMemo(() => rules.filter((r) => r.isActive), [rules]);
  const [ruleId, setRuleId] = React.useState('');
  const [balanceAmount, setBalanceAmount] = React.useState('50000');
  const [daysOverdue, setDaysOverdue] = React.useState('10');
  const [result, setResult] = React.useState<SimulatePenaltyResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const simulate = useSimulatePenaltyRule(ruleId || activeRules[0]?.id || '');

  React.useEffect(() => {
    if (!ruleId && activeRules[0]) setRuleId(activeRules[0].id);
  }, [activeRules, ruleId]);

  async function handleSimulate() {
    setError(null);
    setResult(null);
    if (!ruleId) {
      setError('Sélectionnez une règle active.');
      return;
    }
    const balance = Number(balanceAmount);
    const days = Number(daysOverdue);
    if (!Number.isFinite(balance) || balance < 0) {
      setError('Le solde doit être un nombre positif.');
      return;
    }
    if (!Number.isFinite(days) || days < 0) {
      setError('Le nombre de jours de retard doit être positif.');
      return;
    }
    try {
      const response = await simulate.mutateAsync({ balanceAmount: balance, daysOverdue: days });
      setResult(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulateur de pénalité</CardTitle>
        <CardDescription>
          Aucune écriture : calcule le montant qu&apos;une règle appliquerait pour un solde et un
          retard donnés.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="simulator-rule">Règle</Label>
            <Select value={ruleId} onValueChange={setRuleId}>
              <SelectTrigger id="simulator-rule">
                <SelectValue placeholder="Choisir une règle" />
              </SelectTrigger>
              <SelectContent>
                {activeRules.map((rule) => (
                  <SelectItem key={rule.id} value={rule.id}>
                    {rule.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="simulator-balance">Solde dû (XAF)</Label>
            <Input
              id="simulator-balance"
              type="number"
              min={0}
              value={balanceAmount}
              onChange={(e) => setBalanceAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="simulator-days">Jours de retard</Label>
            <Input
              id="simulator-days"
              type="number"
              min={0}
              value={daysOverdue}
              onChange={(e) => setDaysOverdue(e.target.value)}
            />
          </div>
        </div>

        {error ? (
          <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="button" onClick={handleSimulate} disabled={simulate.isPending}>
          {simulate.isPending ? 'Simulation…' : 'Simuler'}
        </Button>

        {result ? (
          <PenaltySimulatorResult
            result={result}
            amount={<MoneyXaf amount={result.penaltyAmount} />}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
