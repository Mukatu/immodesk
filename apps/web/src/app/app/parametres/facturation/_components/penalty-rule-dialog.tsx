'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EnumSelect } from '@/components/business/enum-select';
import { useUpdatePenaltyRule } from '@/lib/api/hooks/use-penalty-rules';
import { PENALTY_BASIS_LABELS } from '@/lib/enum-labels';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import type { PenaltyBasis, PenaltyRule, PenaltyRuleInput } from '@/lib/api/types';

export interface PenaltyRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: PenaltyRule | null;
  onCreate: (body: PenaltyRuleInput) => Promise<void>;
}

const RATE_BASES: PenaltyBasis[] = ['RATE_BPS_PER_DAY', 'RATE_BPS_PER_MONTH'];

/** Dialog de création/édition d'une règle de pénalité. */
export function PenaltyRuleDialog({ open, onOpenChange, rule, onCreate }: PenaltyRuleDialogProps) {
  const updateRule = useUpdatePenaltyRule(rule?.id ?? '');
  const [name, setName] = React.useState('');
  const [basis, setBasis] = React.useState<PenaltyBasis>('RATE_BPS_PER_MONTH');
  const [rate, setRate] = React.useState('100');
  const [flatAmount, setFlatAmount] = React.useState('0');
  const [graceDays, setGraceDays] = React.useState('5');
  const [isActive, setIsActive] = React.useState(true);
  const [isDefault, setIsDefault] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(rule?.name ?? '');
    setBasis(rule?.basis ?? 'RATE_BPS_PER_MONTH');
    setRate(String(rule?.rateBps ?? 100));
    setFlatAmount(String(rule?.flatAmount ?? 0));
    setGraceDays(String(rule?.graceDays ?? 5));
    setIsActive(rule?.isActive ?? true);
    setIsDefault(rule?.isDefault ?? false);
    setError(null);
  }, [open, rule]);

  const usesRate = RATE_BASES.includes(basis);

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Le nom est requis.');
      return;
    }
    const body: PenaltyRuleInput = {
      name: name.trim(),
      basis,
      rateBps: usesRate ? Number(rate) : undefined,
      flatAmount: usesRate ? undefined : Number(flatAmount),
      graceDays: Number(graceDays),
      isActive,
      isDefault,
    };
    try {
      if (rule) {
        await updateRule.mutateAsync(body);
        toast.success('Règle mise à jour.');
      } else {
        await onCreate(body);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  const pending = updateRule.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rule ? 'Modifier la règle' : 'Nouvelle règle de pénalité'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ruleName">Nom</Label>
            <Input id="ruleName" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ruleBasis">Mode de calcul</Label>
            <EnumSelect<PenaltyBasis>
              id="ruleBasis"
              value={basis}
              onValueChange={setBasis}
              labels={PENALTY_BASIS_LABELS}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {usesRate ? (
              <div className="space-y-2">
                <Label htmlFor="ruleRate">Taux (points de base)</Label>
                <Input
                  id="ruleRate"
                  type="number"
                  min={0}
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="ruleFlat">Montant forfaitaire (XAF)</Label>
                <Input
                  id="ruleFlat"
                  type="number"
                  min={0}
                  value={flatAmount}
                  onChange={(e) => setFlatAmount(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="ruleGrace">Jours de grâce</Label>
              <Input
                id="ruleGrace"
                type="number"
                min={0}
                value={graceDays}
                onChange={(e) => setGraceDays(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Règle active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
            Appliquer par défaut aux nouveaux baux
          </label>
          {error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSubmit} disabled={pending}>
            {pending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
