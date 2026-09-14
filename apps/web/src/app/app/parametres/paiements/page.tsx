'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/business/page-header';
import { useAuth } from '@/lib/auth/auth-context';
import { usePaymentMethods, useUpdatePaymentMethods } from '@/lib/api/hooks/use-payment-methods';
import {
  BankTransferFields,
  MobileMoneyAggregatorFields,
  MobileMoneyDeclaredFields,
  type PaymentMethodsFormValues,
} from './_components/payment-methods-fields';

const schema = z.object({
  mobileMoneyDeclaredEnabled: z.boolean(),
  mobileMoneyAggregatorEnabled: z.boolean(),
  mobileMoneyAggregatorProvider: z.enum(['SIMULATOR', 'CINETPAY']),
  mobileMoneyAggregatorFeeBearer: z.enum(['TENANT', 'ORGANIZATION']),
  mobileMoneyAggregatorFeeRatePercent: z.coerce.number().min(0).max(100),
  mobileMoneyAggregatorMinAmount: z.coerce.number().int().min(0),
  mobileMoneyAggregatorMaxAmount: z.coerce.number().int().min(0),
  bankTransferEnabled: z.boolean(),
  bankTransferConfirmOnApproval: z.boolean(),
  pendingExpiryMinutes: z.coerce.number().int().min(1),
});

/**
 * Paramètres des méthodes de paiement (phase 4) : Mobile Money déclaré, Mobile
 * Money agrégateur (verrouillé côté plateforme) et virement bancaire.
 * Lecture ouverte à MANAGER et au-delà ; écriture réservée à OWNER (contrat
 * `GET/PATCH /v1/organizations/{id}/payment-methods`).
 */
export default function ParametresPaiementsPage() {
  const { currentOrganizationId, currentOrganization } = useAuth();
  const { data: settings, isLoading } = usePaymentMethods(currentOrganizationId);
  const updateSettings = useUpdatePaymentMethods(currentOrganizationId ?? '');
  const isOwner = currentOrganization?.role === 'OWNER';

  const form = useForm<PaymentMethodsFormValues>({
    resolver: zodResolver(schema),
    values: settings
      ? {
          mobileMoneyDeclaredEnabled: settings.mobileMoneyDeclared.enabled,
          mobileMoneyAggregatorEnabled: settings.mobileMoneyAggregator.enabled,
          mobileMoneyAggregatorProvider: settings.mobileMoneyAggregator.provider,
          mobileMoneyAggregatorFeeBearer: settings.mobileMoneyAggregator.feeBearer,
          mobileMoneyAggregatorFeeRatePercent: settings.mobileMoneyAggregator.feeRateBps / 100,
          mobileMoneyAggregatorMinAmount: settings.mobileMoneyAggregator.minAmount,
          mobileMoneyAggregatorMaxAmount: settings.mobileMoneyAggregator.maxAmount,
          bankTransferEnabled: settings.bankTransfer.enabled,
          bankTransferConfirmOnApproval: settings.bankTransfer.confirmOnApproval,
          pendingExpiryMinutes: settings.pendingExpiryMinutes,
        }
      : undefined,
  });

  async function onSubmit(values: PaymentMethodsFormValues) {
    try {
      await updateSettings.mutateAsync({
        mobileMoneyDeclared: { enabled: values.mobileMoneyDeclaredEnabled },
        mobileMoneyAggregator: {
          enabled: values.mobileMoneyAggregatorEnabled,
          provider: values.mobileMoneyAggregatorProvider,
          feeBearer: values.mobileMoneyAggregatorFeeBearer,
          feeRateBps: Math.round(values.mobileMoneyAggregatorFeeRatePercent * 100),
          minAmount: values.mobileMoneyAggregatorMinAmount,
          maxAmount: values.mobileMoneyAggregatorMaxAmount,
        },
        bankTransfer: {
          enabled: values.bankTransferEnabled,
          confirmOnApproval: values.bankTransferConfirmOnApproval,
        },
        pendingExpiryMinutes: values.pendingExpiryMinutes,
      });
      toast.success('Paramètres de paiement mis à jour.');
    } catch {
      toast.error('Impossible de mettre à jour les paramètres de paiement.');
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Méthodes de paiement"
        description="Mobile Money déclaré, Mobile Money agrégateur et virement bancaire."
      />

      {!isOwner ? (
        <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          Lecture seule : seul le propriétaire de l&apos;organisation peut modifier ces paramètres.
        </p>
      ) : null}

      <Card>
        <CardContent className="space-y-8 pt-6">
          {isLoading || !settings ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" noValidate>
              <MobileMoneyDeclaredFields form={form} readOnly={!isOwner} />
              <MobileMoneyAggregatorFields
                form={form}
                readOnly={!isOwner}
                aggregatorAvailable={settings.aggregatorAvailable}
              />
              <BankTransferFields form={form} readOnly={!isOwner} />
              {isOwner ? (
                <Button type="submit" disabled={updateSettings.isPending}>
                  {updateSettings.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              ) : null}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
