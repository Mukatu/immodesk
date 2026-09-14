'use client';

import type { UseFormReturn } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EnumSelect } from '@/components/business/enum-select';
import { MOMO_AGGREGATOR_PROVIDER_LABELS, MOMO_FEE_BEARER_LABELS } from '@/lib/enum-labels';
import type { MomoAggregatorProvider, MomoFeeBearer } from '@/lib/api/types';

export interface PaymentMethodsFormValues {
  mobileMoneyDeclaredEnabled: boolean;
  mobileMoneyAggregatorEnabled: boolean;
  mobileMoneyAggregatorProvider: MomoAggregatorProvider;
  mobileMoneyAggregatorFeeBearer: MomoFeeBearer;
  mobileMoneyAggregatorFeeRatePercent: number;
  mobileMoneyAggregatorMinAmount: number;
  mobileMoneyAggregatorMaxAmount: number;
  bankTransferEnabled: boolean;
  bankTransferConfirmOnApproval: boolean;
  pendingExpiryMinutes: number;
}

interface SectionProps {
  form: UseFormReturn<PaymentMethodsFormValues>;
  /** Écran en lecture seule (rôle courant différent de OWNER). */
  readOnly: boolean;
}

/** Section « Mobile Money déclaré » : le locataire paie hors application, le montant est déclaré puis validé. */
export function MobileMoneyDeclaredFields({ form, readOnly }: SectionProps) {
  const { watch, setValue } = form;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Mobile Money déclaré</h2>
      <p className="text-sm text-muted-foreground">
        Le locataire effectue le transfert lui-même puis sa référence opérateur est déclarée et
        validée par un gestionnaire ou un comptable.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={watch('mobileMoneyDeclaredEnabled')}
          disabled={readOnly}
          onChange={(e) => setValue('mobileMoneyDeclaredEnabled', e.target.checked)}
        />
        Activer ce mode de paiement
      </label>
    </section>
  );
}

/** Section « Mobile Money agrégateur » : verrouillée tant que la plateforme n'a pas activé le drapeau. */
export function MobileMoneyAggregatorFields({
  form,
  readOnly,
  aggregatorAvailable,
}: SectionProps & { aggregatorAvailable: boolean }) {
  const { watch, setValue, register } = form;
  const locked = readOnly || !aggregatorAvailable;
  const enabled = watch('mobileMoneyAggregatorEnabled');
  const fieldsDisabled = locked || !enabled;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Mobile Money agrégateur</h2>
      <p className="text-sm text-muted-foreground">
        Le locataire paie directement depuis l&apos;application, débité par un prestataire
        agrégateur.
      </p>
      {!aggregatorAvailable ? (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          Ce mode sera disponible après activation par la plateforme.
        </p>
      ) : null}
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={enabled}
          disabled={locked}
          onChange={(e) => setValue('mobileMoneyAggregatorEnabled', e.target.checked)}
        />
        Activer ce mode de paiement
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="aggregatorProvider">Fournisseur</Label>
          <EnumSelect<MomoAggregatorProvider>
            id="aggregatorProvider"
            value={watch('mobileMoneyAggregatorProvider')}
            onValueChange={(v) => setValue('mobileMoneyAggregatorProvider', v)}
            labels={MOMO_AGGREGATOR_PROVIDER_LABELS}
            disabled={fieldsDisabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="aggregatorFeeBearer">Prise en charge des frais</Label>
          <EnumSelect<MomoFeeBearer>
            id="aggregatorFeeBearer"
            value={watch('mobileMoneyAggregatorFeeBearer')}
            onValueChange={(v) => setValue('mobileMoneyAggregatorFeeBearer', v)}
            labels={MOMO_FEE_BEARER_LABELS}
            disabled={fieldsDisabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="aggregatorFeeRate">Taux de frais (%)</Label>
          <Input
            id="aggregatorFeeRate"
            type="number"
            min={0}
            max={100}
            step={0.01}
            disabled={fieldsDisabled}
            {...register('mobileMoneyAggregatorFeeRatePercent')}
          />
        </div>
        <div />
        <div className="space-y-2">
          <Label htmlFor="aggregatorMinAmount">Montant minimum (XAF)</Label>
          <Input
            id="aggregatorMinAmount"
            type="number"
            min={0}
            step={100}
            disabled={fieldsDisabled}
            {...register('mobileMoneyAggregatorMinAmount')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="aggregatorMaxAmount">Montant maximum (XAF)</Label>
          <Input
            id="aggregatorMaxAmount"
            type="number"
            min={0}
            step={1000}
            disabled={fieldsDisabled}
            {...register('mobileMoneyAggregatorMaxAmount')}
          />
        </div>
      </div>
    </section>
  );
}

/** Section « Virement bancaire » : politique de confirmation et fenêtre d'expiration. */
export function BankTransferFields({ form, readOnly }: SectionProps) {
  const { watch, setValue, register } = form;
  const confirmOnApproval = watch('bankTransferConfirmOnApproval');

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Virement bancaire</h2>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={watch('bankTransferEnabled')}
          disabled={readOnly}
          onChange={(e) => setValue('bankTransferEnabled', e.target.checked)}
        />
        Activer ce mode de paiement
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={confirmOnApproval}
          disabled={readOnly}
          onChange={(e) => setValue('bankTransferConfirmOnApproval', e.target.checked)}
        />
        Confirmer le paiement dès la validation de la déclaration
      </label>
      <p className="text-sm text-muted-foreground">
        {confirmOnApproval
          ? 'La validation crée immédiatement un paiement confirmé et une quittance ; le rapprochement bancaire viendra seulement pointer l’opération.'
          : 'La validation crée un paiement en attente de confirmation bancaire ; la facture reste en attente jusqu’au rapprochement.'}
      </p>
      <div className="space-y-2 sm:max-w-xs">
        <Label htmlFor="pendingExpiryMinutes">
          Fenêtre d&apos;expiration des paiements en attente (minutes)
        </Label>
        <Input
          id="pendingExpiryMinutes"
          type="number"
          min={1}
          disabled={readOnly}
          {...register('pendingExpiryMinutes')}
        />
      </div>
    </section>
  );
}
