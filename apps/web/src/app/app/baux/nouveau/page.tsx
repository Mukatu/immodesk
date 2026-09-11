'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/business/page-header';
import { useCreateLease } from '@/lib/api/hooks/use-leases';
import { apiFetch } from '@/lib/api/client';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import type { LeaseInput, LeaseParty, LeasePartyInput } from '@/lib/api/types';
import { StepIndicator } from './_components/step-indicator';
import { Step1UnitTenant } from './_components/step1-unit-tenant';
import { Step2Financials } from './_components/step2-financials';
import { Step3DepositParties } from './_components/step3-deposit-parties';
import {
  DEFAULT_WIZARD_DATA,
  type WizardData,
  type WizardErrors,
} from './_components/wizard-types';

const step1Schema = z.object({
  propertyId: z.string().min(1, 'Choisissez un immeuble.'),
  unitId: z.string().min(1, 'Choisissez un lot.'),
  tenantId: z.string().min(1, 'Choisissez un locataire.'),
  startDate: z.string().min(1, 'Date de début requise.'),
});

const step2Schema = z.object({
  rentAmount: z
    .number({ invalid_type_error: 'Le loyer est requis.' })
    .positive('Le loyer doit être supérieur à zéro.'),
  paymentDueDay: z
    .number()
    .int()
    .min(1, "Le jour d'échéance doit être compris entre 1 et 28.")
    .max(28, "Le jour d'échéance doit être compris entre 1 et 28."),
});

function validate(schema: z.ZodTypeAny, data: unknown): WizardErrors {
  const result = schema.safeParse(data);
  if (result.success) return {};
  const errors: WizardErrors = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0]);
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export default function NouveauBailPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [data, setData] = React.useState<WizardData>(DEFAULT_WIZARD_DATA);
  const [errors, setErrors] = React.useState<WizardErrors>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const createLease = useCreateLease();

  function patch(update: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...update }));
  }

  function goNext() {
    if (step === 1) {
      const stepErrors = validate(step1Schema, data);
      setErrors(stepErrors);
      if (Object.keys(stepErrors).length > 0) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      const stepErrors = validate(step2Schema, data);
      setErrors(stepErrors);
      if (Object.keys(stepErrors).length > 0) return;
      setStep(3);
    }
  }

  function goBack() {
    setServerError(null);
    if (step > 1) setStep((prev) => (prev - 1) as 1 | 2 | 3);
  }

  async function handleSubmit() {
    setServerError(null);
    setSubmitting(true);
    try {
      const input: LeaseInput = {
        unitId: data.unitId,
        primaryTenantId: data.tenantId,
        startDate: data.startDate,
        endDate: data.endDate || undefined,
        rentPeriod: data.rentPeriod,
        rentAmount: data.rentAmount ?? 0,
        chargesAmount: data.chargesAmount ?? undefined,
        depositAmount: data.depositAmount ?? undefined,
        paymentDueDay: data.paymentDueDay,
        preferredPaymentMethod: data.preferredPaymentMethod || undefined,
      };
      const lease = await createLease.mutateAsync(input);

      // Le bail est créé à ce stade : toute erreur ci-dessous ne doit plus
      // renvoyer l'utilisateur au formulaire (risque de doublon), seulement
      // avertir et rediriger vers la fiche du bail déjà créé.
      const partyInputs: LeasePartyInput[] = [
        ...data.coTenants.map((coTenant) => ({
          role: 'CO_TENANT' as const,
          tenantId: coTenant.id,
        })),
        ...data.includedGuarantorIds.map((guarantorId) => ({
          role: 'GUARANTOR' as const,
          guarantorId,
        })),
      ];
      let partiesFailed = false;
      for (const body of partyInputs) {
        try {
          await apiFetch<LeaseParty>(`/leases/${lease.id}/parties`, { method: 'POST', body });
        } catch {
          partiesFailed = true;
        }
      }

      if (partiesFailed) {
        toast.warning(
          'Bail créé, mais certaines parties n’ont pas pu être ajoutées. Ajoutez-les depuis la fiche du bail.',
        );
      } else {
        toast.success('Bail créé en brouillon. Activez-le depuis la fiche du bail.');
      }
      router.push(`/app/baux/${lease.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'LEASES.UNIT_NOT_AVAILABLE') {
        setServerError('Ce lot n’est plus disponible. Choisissez un autre lot.');
        setStep(1);
      } else {
        setServerError(error instanceof ApiError ? error.message : genericErrorMessage);
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Nouveau bail" description="Créez un bail en 3 étapes." />

      <StepIndicator step={step} />

      {serverError ? (
        <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
          {serverError}
        </p>
      ) : null}

      {step === 1 ? <Step1UnitTenant data={data} errors={errors} onChange={patch} /> : null}
      {step === 2 ? <Step2Financials data={data} errors={errors} onChange={patch} /> : null}
      {step === 3 ? <Step3DepositParties data={data} onChange={patch} /> : null}

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          disabled={step === 1 || submitting}
        >
          Précédent
        </Button>
        {step < 3 ? (
          <Button type="button" onClick={goNext}>
            Suivant
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Création…' : 'Créer le bail'}
          </Button>
        )}
      </div>
    </div>
  );
}
