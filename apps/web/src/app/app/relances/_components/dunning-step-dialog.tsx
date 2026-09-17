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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EnumSelect } from '@/components/business/enum-select';
import { useCreateDunningRule, useUpdateDunningRule } from '@/lib/api/hooks/use-dunning-rules';
import { usePenaltyRules } from '@/lib/api/hooks/use-penalty-rules';
import { DUNNING_TRIGGER_LABELS, NOTIFICATION_CHANNEL_LABELS } from '@/lib/enum-labels';
import { ApiError } from '@/lib/api/errors';
import type {
  DunningRule,
  DunningRuleInput,
  DunningTrigger,
  NotificationChannel,
} from '@/lib/api/types';

export interface DunningStepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: DunningRule | null;
}

/** Message d'erreur fr-CG explicite, indépendant du message renvoyé par l'API. */
function errorMessageFor(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'DUNNING.STEP_ORDER_TAKEN') {
      return 'Ce rang de palier est déjà utilisé par un autre palier. Choisissez un autre rang.';
    }
    return err.message;
  }
  return 'Une erreur est survenue. Veuillez réessayer.';
}

/** Création/modification d'un palier de relance. Un palier ne se supprime jamais, il se désactive. */
export function DunningStepDialog({ open, onOpenChange, rule }: DunningStepDialogProps) {
  const createRule = useCreateDunningRule();
  const updateRule = useUpdateDunningRule(rule?.id ?? '');
  const { data: penaltyRulesData } = usePenaltyRules();

  const [name, setName] = React.useState('');
  const [stepOrder, setStepOrder] = React.useState('1');
  const [triggerType, setTriggerType] = React.useState<DunningTrigger>('DAYS_AFTER_DUE');
  const [offsetDays, setOffsetDays] = React.useState('5');
  const [channel, setChannel] = React.useState<NotificationChannel>('WHATSAPP');
  const [fallbackChannel, setFallbackChannel] = React.useState<NotificationChannel | ''>('SMS');
  const [minBalanceAmount, setMinBalanceAmount] = React.useState('0');
  const [sendHourLocal, setSendHourLocal] = React.useState('9');
  const [skipWeekends, setSkipWeekends] = React.useState(true);
  const [notifyLandlord, setNotifyLandlord] = React.useState(false);
  const [notifyCollector, setNotifyCollector] = React.useState(false);
  const [applyPenalty, setApplyPenalty] = React.useState(false);
  const [penaltyRuleId, setPenaltyRuleId] = React.useState('');
  const [escalateToLegal, setEscalateToLegal] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(rule?.name ?? '');
    setStepOrder(String(rule?.stepOrder ?? 1));
    setTriggerType(rule?.triggerType ?? 'DAYS_AFTER_DUE');
    setOffsetDays(String(rule?.offsetDays ?? 5));
    setChannel(rule?.channel ?? 'WHATSAPP');
    setFallbackChannel(rule?.fallbackChannel ?? 'SMS');
    setMinBalanceAmount(String(rule?.minBalanceAmount ?? 0));
    setSendHourLocal(String(rule?.sendHourLocal ?? 9));
    setSkipWeekends(rule?.skipWeekends ?? true);
    setNotifyLandlord(rule?.notifyLandlord ?? false);
    setNotifyCollector(rule?.notifyCollector ?? false);
    setApplyPenalty(rule?.applyPenalty ?? false);
    setPenaltyRuleId(rule?.penaltyRuleId ?? '');
    setEscalateToLegal(rule?.escalateToLegal ?? false);
    setError(null);
  }, [open, rule]);

  const pending = createRule.isPending || updateRule.isPending;

  async function handleSubmit() {
    setError(null);
    if (!name.trim()) {
      setError('Le nom est requis.');
      return;
    }
    const body: DunningRuleInput = {
      name: name.trim(),
      stepOrder: Number(stepOrder),
      triggerType,
      offsetDays: Number(offsetDays),
      channel,
      fallbackChannel: fallbackChannel || undefined,
      minBalanceAmount: Number(minBalanceAmount),
      sendHourLocal: Number(sendHourLocal),
      skipWeekends,
      notifyLandlord,
      notifyCollector,
      applyPenalty,
      penaltyRuleId: applyPenalty ? penaltyRuleId || undefined : undefined,
      escalateToLegal,
    };
    try {
      if (rule) {
        await updateRule.mutateAsync(body);
        toast.success('Palier mis à jour.');
      } else {
        await createRule.mutateAsync(body);
        toast.success('Palier créé.');
      }
      onOpenChange(false);
    } catch (err) {
      setError(errorMessageFor(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? 'Modifier le palier' : 'Nouveau palier de relance'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="step-name">Nom</Label>
              <Input id="step-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="step-order">Rang</Label>
              <Input
                id="step-order"
                type="number"
                min={1}
                value={stepOrder}
                onChange={(e) => setStepOrder(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="step-trigger">Déclencheur</Label>
              <EnumSelect<DunningTrigger>
                id="step-trigger"
                value={triggerType}
                onValueChange={setTriggerType}
                labels={DUNNING_TRIGGER_LABELS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="step-offset">Décalage (jours)</Label>
              <Input
                id="step-offset"
                type="number"
                min={0}
                value={offsetDays}
                onChange={(e) => setOffsetDays(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="step-channel">Canal</Label>
              <EnumSelect<NotificationChannel>
                id="step-channel"
                value={channel}
                onValueChange={setChannel}
                labels={NOTIFICATION_CHANNEL_LABELS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="step-fallback">Canal de repli</Label>
              <Select
                value={fallbackChannel || 'NONE'}
                onValueChange={(v) =>
                  setFallbackChannel(v === 'NONE' ? '' : (v as NotificationChannel))
                }
              >
                <SelectTrigger id="step-fallback">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Aucun</SelectItem>
                  {(Object.keys(NOTIFICATION_CHANNEL_LABELS) as NotificationChannel[]).map(
                    (value) => (
                      <SelectItem key={value} value={value}>
                        {NOTIFICATION_CHANNEL_LABELS[value]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="step-min-balance">Solde minimum (XAF)</Label>
              <Input
                id="step-min-balance"
                type="number"
                min={0}
                value={minBalanceAmount}
                onChange={(e) => setMinBalanceAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="step-send-hour">Heure d&apos;envoi locale</Label>
              <Input
                id="step-send-hour"
                type="number"
                min={0}
                max={23}
                value={sendHourLocal}
                onChange={(e) => setSendHourLocal(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={skipWeekends} onChange={(e) => setSkipWeekends(e.target.checked)} />
            Reporter au lundi si le calcul tombe un week-end
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={notifyLandlord}
              onChange={(e) => setNotifyLandlord(e.target.checked)}
            />
            Informer le bailleur
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={notifyCollector}
              onChange={(e) => setNotifyCollector(e.target.checked)}
            />
            Informer le démarcheur
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={escalateToLegal}
              onChange={(e) => setEscalateToLegal(e.target.checked)}
            />
            Escalader au garant (double envoi)
          </label>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={applyPenalty} onChange={(e) => setApplyPenalty(e.target.checked)} />
            Appliquer une pénalité à ce palier
          </label>
          {applyPenalty ? (
            <div className="space-y-2">
              <Label htmlFor="step-penalty-rule">Règle de pénalité</Label>
              <Select value={penaltyRuleId} onValueChange={setPenaltyRuleId}>
                <SelectTrigger id="step-penalty-rule">
                  <SelectValue placeholder="Choisir une règle" />
                </SelectTrigger>
                <SelectContent>
                  {(penaltyRulesData?.items ?? []).map((pr) => (
                    <SelectItem key={pr.id} value={pr.id}>
                      {pr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {error ? (
            <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
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
