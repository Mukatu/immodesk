'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PageHeader } from '@/components/business/page-header';
import { PhoneInput } from '@/components/business/phone-input';
import { MoneyInput } from '@/components/business/money-input';
import { EnumSelect } from '@/components/business/enum-select';
import { toE164Congo } from '@/lib/phone';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { useCreateTenant } from '@/lib/api/hooks/use-tenants';
import { ApiErrorCode } from '@/lib/api/types';
import type { TenantInput } from '@/lib/api/types';
import { GENDER_LABELS, ID_DOCUMENT_TYPE_LABELS, PARTY_TYPE_LABELS } from '@/lib/enum-labels';

const optionalLocalPhone = z
  .string()
  .optional()
  .refine((v) => !v || toE164Congo(v) !== null, 'Numéro invalide.');

const schema = z
  .object({
    partyType: z.enum(['INDIVIDUAL', 'COMPANY']),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    companyName: z.string().optional(),
    gender: z.enum(['MALE', 'FEMALE', 'UNSPECIFIED']).optional(),
    birthDate: z.string().optional(),
    birthPlace: z.string().optional(),
    nationality: z.string().optional(),
    idDocumentType: z
      .enum([
        'CNI',
        'PASSPORT',
        'RESIDENCE_PERMIT',
        'DRIVING_LICENSE',
        'VOTER_CARD',
        'RCCM',
        'NIU',
        'OTHER',
      ])
      .optional(),
    idDocumentNumber: z.string().optional(),
    idDocumentExpiry: z.string().optional(),
    profession: z.string().optional(),
    employerName: z.string().optional(),
    monthlyIncome: z.number().nullable().optional(),
    primaryPhone: z.string().refine((v) => toE164Congo(v) !== null, 'Numéro invalide.'),
    secondaryPhone: optionalLocalPhone,
    whatsappPhone: optionalLocalPhone,
    email: z.string().email('Adresse e-mail invalide.').optional().or(z.literal('')),
    addressLine: z.string().optional(),
    district: z.string().optional(),
    city: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: optionalLocalPhone,
    notes: z.string().optional(),
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
  gender: undefined,
  birthDate: '',
  birthPlace: '',
  nationality: '',
  idDocumentType: undefined,
  idDocumentNumber: '',
  idDocumentExpiry: '',
  profession: '',
  employerName: '',
  monthlyIncome: null,
  primaryPhone: '',
  secondaryPhone: '',
  whatsappPhone: '',
  email: '',
  addressLine: '',
  district: '',
  city: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  notes: '',
};

/** Convertit les valeurs du formulaire en TenantInput (contrat API), en omettant les champs vides. */
function buildTenantInput(values: FormValues): TenantInput {
  const input: TenantInput = {
    partyType: values.partyType,
    primaryPhone: toE164Congo(values.primaryPhone) ?? values.primaryPhone,
  };
  if (values.partyType === 'INDIVIDUAL') {
    input.firstName = values.firstName || undefined;
    input.lastName = values.lastName || undefined;
    input.gender = values.gender || undefined;
    input.birthDate = values.birthDate || undefined;
    input.birthPlace = values.birthPlace || undefined;
    input.nationality = values.nationality || undefined;
  } else {
    input.companyName = values.companyName || undefined;
  }
  input.idDocumentType = values.idDocumentType || undefined;
  input.idDocumentNumber = values.idDocumentNumber || undefined;
  input.idDocumentExpiry = values.idDocumentExpiry || undefined;
  input.profession = values.profession || undefined;
  input.employerName = values.employerName || undefined;
  input.monthlyIncome = values.monthlyIncome ?? undefined;
  input.secondaryPhone = values.secondaryPhone
    ? (toE164Congo(values.secondaryPhone) ?? undefined)
    : undefined;
  input.whatsappPhone = values.whatsappPhone
    ? (toE164Congo(values.whatsappPhone) ?? undefined)
    : undefined;
  input.email = values.email || undefined;
  input.addressLine = values.addressLine || undefined;
  input.district = values.district || undefined;
  input.city = values.city || undefined;
  input.emergencyContactName = values.emergencyContactName || undefined;
  input.emergencyContactPhone = values.emergencyContactPhone
    ? (toE164Congo(values.emergencyContactPhone) ?? undefined)
    : undefined;
  input.notes = values.notes || undefined;
  return input;
}

export default function NouveauLocatairePage() {
  const router = useRouter();
  const createTenant = useCreateTenant();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [duplicatePhoneOpen, setDuplicatePhoneOpen] = React.useState(false);
  const [pendingInput, setPendingInput] = React.useState<TenantInput | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });

  const partyType = form.watch('partyType');

  async function submitTenant(input: TenantInput, confirmDuplicatePhone = false) {
    setServerError(null);
    try {
      const tenant = await createTenant.mutateAsync({ ...input, confirmDuplicatePhone });
      router.push(`/app/locataires/${tenant.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.code === ApiErrorCode.PHONE_ALREADY_USED) {
        setPendingInput(input);
        setDuplicatePhoneOpen(true);
        return;
      }
      setServerError(error instanceof ApiError ? error.message : genericErrorMessage);
    }
  }

  async function onSubmit(values: FormValues) {
    await submitTenant(buildTenantInput(values));
  }

  function handleConfirmDuplicate() {
    setDuplicatePhoneOpen(false);
    if (pendingInput) void submitTenant(pendingInput, true);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Nouveau locataire"
        description="Renseignez les informations du locataire. Vous pourrez compléter sa fiche plus tard."
      />

      <Dialog open={duplicatePhoneOpen} onOpenChange={setDuplicatePhoneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Numéro déjà utilisé</DialogTitle>
            <DialogDescription>
              Ce numéro est déjà utilisé par un autre locataire. Voulez-vous créer ce locataire
              quand même ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDuplicatePhoneOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDuplicate}
              disabled={createTenant.isPending}
            >
              Créer quand même
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <Card>
            <CardHeader>
              <CardTitle>Identité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="partyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="partyType">Type de tiers</FormLabel>
                    <FormControl>
                      <EnumSelect
                        id="partyType"
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="firstName">Prénom</FormLabel>
                        <FormControl>
                          <Input id="firstName" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="lastName">Nom</FormLabel>
                        <FormControl>
                          <Input id="lastName" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="companyName">Raison sociale</FormLabel>
                      <FormControl>
                        <Input id="companyName" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {partyType === 'INDIVIDUAL' ? (
                <>
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="gender">Sexe</FormLabel>
                        <FormControl>
                          <EnumSelect
                            id="gender"
                            value={field.value ?? ''}
                            onValueChange={field.onChange}
                            labels={GENDER_LABELS}
                            placeholder="Sélectionner"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="birthDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="birthDate">Date de naissance</FormLabel>
                          <FormControl>
                            <Input id="birthDate" type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="birthPlace"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="birthPlace">Lieu de naissance</FormLabel>
                          <FormControl>
                            <Input id="birthPlace" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nationality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="nationality">Nationalité</FormLabel>
                          <FormControl>
                            <Input id="nationality" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="idDocumentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="idDocumentType">Type de pièce</FormLabel>
                      <FormControl>
                        <EnumSelect
                          id="idDocumentType"
                          value={field.value ?? ''}
                          onValueChange={field.onChange}
                          labels={ID_DOCUMENT_TYPE_LABELS}
                          placeholder="Sélectionner"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="idDocumentNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="idDocumentNumber">Numéro de pièce</FormLabel>
                      <FormControl>
                        <Input id="idDocumentNumber" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="idDocumentExpiry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="idDocumentExpiry">Date d’expiration</FormLabel>
                      <FormControl>
                        <Input id="idDocumentExpiry" type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="primaryPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="primaryPhone">Téléphone principal</FormLabel>
                    <FormControl>
                      <PhoneInput
                        id="primaryPhone"
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="secondaryPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="secondaryPhone">
                        Téléphone secondaire (optionnel)
                      </FormLabel>
                      <FormControl>
                        <PhoneInput
                          id="secondaryPhone"
                          value={field.value ?? ''}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="whatsappPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="whatsappPhone">WhatsApp (optionnel)</FormLabel>
                      <FormControl>
                        <PhoneInput
                          id="whatsappPhone"
                          value={field.value ?? ''}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="email">E-mail (optionnel)</FormLabel>
                    <FormControl>
                      <Input id="email" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="addressLine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="addressLine">Adresse</FormLabel>
                    <FormControl>
                      <Input id="addressLine" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="district">Quartier</FormLabel>
                      <FormControl>
                        <Input id="district" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="city">Ville</FormLabel>
                      <FormControl>
                        <Input id="city" placeholder="Brazzaville" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Situation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="profession"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="profession">Profession</FormLabel>
                      <FormControl>
                        <Input id="profession" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="employerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="employerName">Employeur</FormLabel>
                      <FormControl>
                        <Input id="employerName" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="monthlyIncome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="monthlyIncome">Revenu mensuel (optionnel)</FormLabel>
                    <FormControl>
                      <MoneyInput
                        id="monthlyIncome"
                        value={field.value ?? null}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact d’urgence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="emergencyContactName">Nom (optionnel)</FormLabel>
                      <FormControl>
                        <Input id="emergencyContactName" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="emergencyContactPhone">Téléphone (optionnel)</FormLabel>
                      <FormControl>
                        <PhoneInput
                          id="emergencyContactPhone"
                          value={field.value ?? ''}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="notes">Notes internes (optionnel)</FormLabel>
                    <FormControl>
                      <Textarea id="notes" rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {serverError ? (
            <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
              {serverError}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/app/locataires')}>
              Annuler
            </Button>
            <Button type="submit" disabled={createTenant.isPending}>
              {createTenant.isPending ? 'Création…' : 'Créer le locataire'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
