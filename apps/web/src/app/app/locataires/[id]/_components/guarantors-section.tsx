'use client';

import * as React from 'react';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Trash2, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { EmptyState } from '@/components/business/empty-state';
import { PhoneDisplay } from '@/components/business/phone-display';
import { PhoneInput } from '@/components/business/phone-input';
import { MoneyInput } from '@/components/business/money-input';
import { MoneyXaf } from '@/components/business/money-xaf';
import { EnumSelect } from '@/components/business/enum-select';
import { toE164Congo } from '@/lib/phone';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import {
  useCreateGuarantor,
  useDeleteGuarantor,
  useUpdateGuarantor,
} from '@/lib/api/hooks/use-guarantors';
import { PARTY_TYPE_LABELS } from '@/lib/enum-labels';
import type { Guarantor, GuarantorInput } from '@/lib/api/types';

const schema = z
  .object({
    partyType: z.enum(['INDIVIDUAL', 'COMPANY']),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    companyName: z.string().optional(),
    primaryPhone: z.string().refine((v) => toE164Congo(v) !== null, 'Numéro invalide.'),
    relationship: z.string().optional(),
    guaranteeAmount: z.number().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.partyType === 'INDIVIDUAL' && !data.lastName?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Nom requis.', path: ['lastName'] });
    }
    if (data.partyType === 'COMPANY' && !data.companyName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Raison sociale requise.',
        path: ['companyName'],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  partyType: 'INDIVIDUAL',
  firstName: '',
  lastName: '',
  companyName: '',
  primaryPhone: '',
  relationship: '',
  guaranteeAmount: null,
};

function localFromE164(phone: string): string {
  return phone.startsWith('+242') ? phone.slice(4) : '';
}

function buildDefaults(guarantor: Guarantor): FormValues {
  return {
    partyType: guarantor.partyType,
    firstName: guarantor.firstName ?? '',
    lastName: guarantor.lastName ?? '',
    companyName: guarantor.companyName ?? '',
    primaryPhone: localFromE164(guarantor.primaryPhone),
    relationship: guarantor.relationship ?? '',
    guaranteeAmount: guarantor.guaranteeAmount ?? null,
  };
}

/** Convertit les valeurs du formulaire minimal en GuarantorInput (contrat API). */
function buildGuarantorInput(values: FormValues): GuarantorInput {
  return {
    partyType: values.partyType,
    firstName: values.partyType === 'INDIVIDUAL' ? values.firstName || undefined : undefined,
    lastName: values.partyType === 'INDIVIDUAL' ? values.lastName || undefined : undefined,
    companyName: values.partyType === 'COMPANY' ? values.companyName || undefined : undefined,
    primaryPhone: toE164Congo(values.primaryPhone) ?? values.primaryPhone,
    relationship: values.relationship || undefined,
    guaranteeAmount: values.guaranteeAmount ?? undefined,
  };
}

/** Champs communs aux formulaires de création et de modification d'un garant. */
function GuarantorFormFields({
  control,
  idPrefix,
  partyType,
}: {
  control: Control<FormValues>;
  idPrefix: string;
  partyType: 'INDIVIDUAL' | 'COMPANY';
}) {
  return (
    <>
      <FormField
        control={control}
        name="partyType"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor={`${idPrefix}-partyType`}>Type de tiers</FormLabel>
            <FormControl>
              <EnumSelect
                id={`${idPrefix}-partyType`}
                value={field.value}
                onValueChange={field.onChange}
                labels={PARTY_TYPE_LABELS}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {partyType === 'INDIVIDUAL' ? (
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor={`${idPrefix}-firstName`}>Prénom</FormLabel>
                <FormControl>
                  <Input id={`${idPrefix}-firstName`} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor={`${idPrefix}-lastName`}>Nom</FormLabel>
                <FormControl>
                  <Input id={`${idPrefix}-lastName`} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ) : (
        <FormField
          control={control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor={`${idPrefix}-companyName`}>Raison sociale</FormLabel>
              <FormControl>
                <Input id={`${idPrefix}-companyName`} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={control}
        name="primaryPhone"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor={`${idPrefix}-primaryPhone`}>Téléphone</FormLabel>
            <FormControl>
              <PhoneInput
                id={`${idPrefix}-primaryPhone`}
                value={field.value}
                onValueChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="relationship"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor={`${idPrefix}-relationship`}>Lien avec le locataire</FormLabel>
            <FormControl>
              <Input id={`${idPrefix}-relationship`} placeholder="Frère, employeur…" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="guaranteeAmount"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor={`${idPrefix}-guaranteeAmount`}>
              Montant de garantie (optionnel)
            </FormLabel>
            <FormControl>
              <MoneyInput
                id={`${idPrefix}-guaranteeAmount`}
                value={field.value ?? null}
                onValueChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function CreateGuarantorSheet({
  tenantId,
  open,
  onOpenChange,
}: {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createGuarantor = useCreateGuarantor(tenantId);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });
  const partyType = form.watch('partyType');

  React.useEffect(() => {
    if (open) {
      form.reset(DEFAULT_VALUES);
      setServerError(null);
    }
  }, [open, form]);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await createGuarantor.mutateAsync(buildGuarantorInput(values));
      onOpenChange(false);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : genericErrorMessage);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Ajouter un garant</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <GuarantorFormFields
              control={form.control}
              idPrefix="new-guarantor"
              partyType={partyType}
            />
            {serverError ? (
              <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
                {serverError}
              </p>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createGuarantor.isPending}>
                {createGuarantor.isPending ? 'Ajout…' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

function EditGuarantorSheet({
  tenantId,
  guarantor,
  open,
  onOpenChange,
}: {
  tenantId: string;
  guarantor: Guarantor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateGuarantor = useUpdateGuarantor(tenantId);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(guarantor),
  });
  const partyType = form.watch('partyType');

  React.useEffect(() => {
    if (open) {
      form.reset(buildDefaults(guarantor));
      setServerError(null);
    }
  }, [open, guarantor, form]);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await updateGuarantor.mutateAsync({ id: guarantor.id, body: buildGuarantorInput(values) });
      onOpenChange(false);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : genericErrorMessage);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Modifier le garant</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <GuarantorFormFields
              control={form.control}
              idPrefix={`guarantor-${guarantor.id}`}
              partyType={partyType}
            />
            {serverError ? (
              <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
                {serverError}
              </p>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={updateGuarantor.isPending}>
                {updateGuarantor.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

function GuarantorRow({ tenantId, guarantor }: { tenantId: string; guarantor: Guarantor }) {
  const [editOpen, setEditOpen] = React.useState(false);
  const deleteGuarantor = useDeleteGuarantor(tenantId);

  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-border py-3 last:border-b-0">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium text-foreground">{guarantor.displayName}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <PhoneDisplay phone={guarantor.primaryPhone} />
          {guarantor.relationship ? <span>{guarantor.relationship}</span> : null}
          {guarantor.guaranteeAmount != null ? (
            <MoneyXaf amount={guarantor.guaranteeAmount} />
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Modifier ${guarantor.displayName}`}
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Supprimer ${guarantor.displayName}`}
          onClick={() => deleteGuarantor.mutate(guarantor.id)}
          disabled={deleteGuarantor.isPending}
        >
          <Trash2 className="size-4 text-destructive" aria-hidden="true" />
        </Button>
      </div>
      <EditGuarantorSheet
        tenantId={tenantId}
        guarantor={guarantor}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </li>
  );
}

export function GuarantorsSection({
  tenantId,
  guarantors,
}: {
  tenantId: string;
  guarantors: Guarantor[];
}) {
  const [createOpen, setCreateOpen] = React.useState(false);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Garants</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
          <UserPlus className="mr-2 size-4" aria-hidden="true" />
          Ajouter un garant
        </Button>
      </CardHeader>
      <CardContent>
        {guarantors.length === 0 ? (
          <EmptyState title="Aucun garant" description="Ajoutez un garant pour ce locataire." />
        ) : (
          <ul>
            {guarantors.map((guarantor) => (
              <GuarantorRow key={guarantor.id} tenantId={tenantId} guarantor={guarantor} />
            ))}
          </ul>
        )}
      </CardContent>
      <CreateGuarantorSheet tenantId={tenantId} open={createOpen} onOpenChange={setCreateOpen} />
    </Card>
  );
}
