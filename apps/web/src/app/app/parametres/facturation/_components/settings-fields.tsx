'use client';

import type { UseFormReturn } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PenaltyRule } from '@/lib/api/types';

export interface SettingsFormValues {
  generateDaysBefore: number;
  autoIssue: boolean;
  applyPenalties: boolean;
  defaultPenaltyRuleId: string;
  collectorHoldingCapAmount: number;
  requireTenantSignature: boolean;
  denominationsEnabled: boolean;
  channelOrder: 'WHATSAPP_FIRST' | 'SMS_FIRST';
  sendCashReceiptToTenant: boolean;
  sendInvoiceIssued: boolean;
}

interface SectionProps {
  form: UseFormReturn<SettingsFormValues>;
}

/** Section « Facturation » : génération automatique et pénalités par défaut. */
export function BillingFields({
  form,
  penaltyRuleOptions,
}: SectionProps & { penaltyRuleOptions: PenaltyRule[] }) {
  const { register, watch, setValue } = form;
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Facturation</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="generateDaysBefore">Jours avant échéance pour générer la facture</Label>
          <Input
            id="generateDaysBefore"
            type="number"
            min={0}
            max={30}
            {...register('generateDaysBefore')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultPenaltyRuleId">Règle de pénalité par défaut</Label>
          <Select
            value={watch('defaultPenaltyRuleId') || undefined}
            onValueChange={(v) => setValue('defaultPenaltyRuleId', v)}
          >
            <SelectTrigger id="defaultPenaltyRuleId">
              <SelectValue placeholder="Aucune" />
            </SelectTrigger>
            <SelectContent>
              {penaltyRuleOptions.map((rule) => (
                <SelectItem key={rule.id} value={rule.id}>
                  {rule.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={watch('autoIssue')}
          onChange={(e) => setValue('autoIssue', e.target.checked)}
        />
        Émettre automatiquement les factures générées par le cron
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={watch('applyPenalties')}
          onChange={(e) => setValue('applyPenalties', e.target.checked)}
        />
        Appliquer les pénalités de retard
      </label>
    </section>
  );
}

/** Section « Caisse » : plafond de détention des démarcheurs et exigences de reçu. */
export function CashFields({ form }: SectionProps) {
  const { register, watch, setValue } = form;
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Caisse</h2>
      <div className="space-y-2 sm:max-w-xs">
        <Label htmlFor="collectorHoldingCapAmount">
          Plafond d&apos;encours par démarcheur (XAF)
        </Label>
        <Input
          id="collectorHoldingCapAmount"
          type="number"
          min={0}
          step={1000}
          {...register('collectorHoldingCapAmount')}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={watch('requireTenantSignature')}
          onChange={(e) => setValue('requireTenantSignature', e.target.checked)}
        />
        Exiger la signature du locataire à chaque encaissement
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={watch('denominationsEnabled')}
          onChange={(e) => setValue('denominationsEnabled', e.target.checked)}
        />
        Activer la saisie des coupures à la remise
      </label>
    </section>
  );
}

/** Section « Messagerie » : ordre des canaux et envois automatiques. */
export function MessagingFields({ form }: SectionProps) {
  const { watch, setValue } = form;
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Messagerie</h2>
      <div className="space-y-2 sm:max-w-xs">
        <Label htmlFor="channelOrder">Ordre des canaux</Label>
        <Select
          value={watch('channelOrder')}
          onValueChange={(v) => setValue('channelOrder', v as SettingsFormValues['channelOrder'])}
        >
          <SelectTrigger id="channelOrder">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="WHATSAPP_FIRST">WhatsApp puis SMS</SelectItem>
            <SelectItem value="SMS_FIRST">SMS puis WhatsApp</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={watch('sendCashReceiptToTenant')}
          onChange={(e) => setValue('sendCashReceiptToTenant', e.target.checked)}
        />
        Envoyer le reçu de caisse au locataire
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={watch('sendInvoiceIssued')}
          onChange={(e) => setValue('sendInvoiceIssued', e.target.checked)}
        />
        Envoyer l&apos;avis d&apos;échéance à l&apos;émission de la facture
      </label>
    </section>
  );
}
