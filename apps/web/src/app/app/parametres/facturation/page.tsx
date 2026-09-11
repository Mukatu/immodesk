'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/business/page-header';
import { useAuth } from '@/lib/auth/auth-context';
import {
  useOrganizationSettings,
  useUpdateOrganizationSettings,
} from '@/lib/api/hooks/use-organizations';
import { usePenaltyRules } from '@/lib/api/hooks/use-penalty-rules';
import { PenaltyRulesSection } from './_components/penalty-rules-section';
import { BillingFields, CashFields, MessagingFields } from './_components/settings-fields';

const schema = z.object({
  generateDaysBefore: z.coerce.number().int().min(0).max(30),
  autoIssue: z.boolean(),
  applyPenalties: z.boolean(),
  defaultPenaltyRuleId: z.string(),
  collectorHoldingCapAmount: z.coerce.number().int().min(0),
  requireTenantSignature: z.boolean(),
  denominationsEnabled: z.boolean(),
  channelOrder: z.enum(['WHATSAPP_FIRST', 'SMS_FIRST']),
  sendCashReceiptToTenant: z.boolean(),
  sendInvoiceIssued: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

/** Paramètres de facturation, caisse et messagerie de l'organisation (phase 3). */
export default function ParametresFacturationPage() {
  const { currentOrganizationId } = useAuth();
  const { data: settings, isLoading } = useOrganizationSettings(currentOrganizationId);
  const { data: penaltyRulesData } = usePenaltyRules();
  const updateSettings = useUpdateOrganizationSettings(currentOrganizationId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: settings
      ? {
          generateDaysBefore: settings.billing.generateDaysBefore,
          autoIssue: settings.billing.autoIssue,
          applyPenalties: settings.billing.applyPenalties,
          defaultPenaltyRuleId: settings.billing.defaultPenaltyRuleId ?? '',
          collectorHoldingCapAmount: settings.cash.collectorHoldingCapAmount,
          requireTenantSignature: settings.cash.requireTenantSignature,
          denominationsEnabled: settings.cash.denominationsEnabled,
          channelOrder:
            settings.messaging.receiptChannelOrder[0] === 'SMS' ? 'SMS_FIRST' : 'WHATSAPP_FIRST',
          sendCashReceiptToTenant: settings.messaging.sendCashReceiptToTenant,
          sendInvoiceIssued: settings.messaging.sendInvoiceIssued,
        }
      : undefined,
  });

  async function onSubmit(values: FormValues) {
    try {
      await updateSettings.mutateAsync({
        billing: {
          generateDaysBefore: values.generateDaysBefore,
          autoIssue: values.autoIssue,
          applyPenalties: values.applyPenalties,
          defaultPenaltyRuleId: values.defaultPenaltyRuleId || null,
        },
        cash: {
          collectorHoldingCapAmount: values.collectorHoldingCapAmount,
          requireTenantSignature: values.requireTenantSignature,
          denominationsEnabled: values.denominationsEnabled,
        },
        messaging: {
          receiptChannelOrder:
            values.channelOrder === 'SMS_FIRST' ? ['SMS', 'WHATSAPP'] : ['WHATSAPP', 'SMS'],
          sendCashReceiptToTenant: values.sendCashReceiptToTenant,
          sendInvoiceIssued: values.sendInvoiceIssued,
        },
      });
      toast.success('Paramètres mis à jour.');
    } catch {
      toast.error('Impossible de mettre à jour les paramètres.');
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Facturation, caisse et messagerie"
        description="Réglages du moteur de facturation, du plafond de caisse et des envois."
      />

      <Card>
        <CardContent className="pt-6">
          {isLoading || !settings ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" noValidate>
              <BillingFields form={form} penaltyRuleOptions={penaltyRulesData?.items ?? []} />
              <CashFields form={form} />
              <MessagingFields form={form} />
              <Button type="submit" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <PenaltyRulesSection />
    </div>
  );
}
