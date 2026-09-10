'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { PhoneDisplay } from '@/components/business/phone-display';
import { PhoneInput } from '@/components/business/phone-input';
import { AddressBlock } from '@/components/business/address-block';
import { MoneyInput } from '@/components/business/money-input';
import { MoneyXaf } from '@/components/business/money-xaf';
import { EnumSelect } from '@/components/business/enum-select';
import { toE164Congo } from '@/lib/phone';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { useUpdateTenant } from '@/lib/api/hooks/use-tenants';
import { GENDER_LABELS, ID_DOCUMENT_TYPE_LABELS, PARTY_TYPE_LABELS } from '@/lib/enum-labels';
import type { TenantDetail, TenantInput } from '@/lib/api/types';

/** Formate une date ISO ("YYYY-MM-DD") en date lisible fr-CG ; retombe sur la valeur brute. */
function formatDateFr(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('fr-FR');
}

interface DetailRow {
  label: string;
  value?: React.ReactNode;
}

/** Bloc de définition (dl) affichant des paires libellé/valeur, en masquant les champs vides. */
function DetailList({ rows }: { rows: DetailRow[] }) {
  const filled = rows.filter(
    (row) => row.value !== undefined && row.value !== null && row.value !== '',
  );
  if (filled.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune information renseignée.</p>;
  }
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      {filled.map((row) => (
        <div key={row.label} className="contents">
          <dt className="font-medium text-muted-foreground">{row.label}</dt>
          <dd className="text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function localFromE164(phone?: string | null): string {
  return phone && phone.startsWith('+242') ? phone.slice(4) : '';
}

const optionalLocalPhone = z
  .string()
  .optional()
  .refine((v) => !v || toE164Congo(v) !== null, 'Numéro invalide.');

const editSchema = z
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

type EditValues = z.infer<typeof editSchema>;

function buildDefaults(tenant: TenantDetail): EditValues {
  return {
    partyType: tenant.partyType,
    firstName: tenant.firstName ?? '',
    lastName: tenant.lastName ?? '',
    companyName: tenant.companyName ?? '',
    gender: tenant.gender,
    birthDate: tenant.birthDate ?? '',
    birthPlace: tenant.birthPlace ?? '',
    nationality: tenant.nationality ?? '',
    idDocumentType: tenant.idDocumentType,
    idDocumentNumber: tenant.idDocumentNumber ?? '',
    idDocumentExpiry: tenant.idDocumentExpiry ?? '',
    profession: tenant.profession ?? '',
    employerName: tenant.employerName ?? '',
    monthlyIncome: tenant.monthlyIncome ?? null,
    primaryPhone: localFromE164(tenant.primaryPhone),
    secondaryPhone: localFromE164(tenant.secondaryPhone),
    whatsappPhone: localFromE164(tenant.whatsappPhone),
    email: tenant.email ?? '',
    addressLine: tenant.addressLine ?? '',
    district: tenant.district ?? '',
    city: tenant.city ?? '',
    emergencyContactName: tenant.emergencyContactName ?? '',
    emergencyContactPhone: localFromE164(tenant.emergencyContactPhone),
    notes: tenant.notes ?? '',
  };
}

/** Convertit les valeurs du formulaire d'édition en Partial<TenantInput> pour le PATCH. */
function buildTenantPatch(values: EditValues): Partial<TenantInput> {
  return {
    partyType: values.partyType,
    firstName: values.partyType === 'INDIVIDUAL' ? values.firstName || undefined : undefined,
    lastName: values.partyType === 'INDIVIDUAL' ? values.lastName || undefined : undefined,
    companyName: values.partyType === 'COMPANY' ? values.companyName || undefined : undefined,
    gender: values.partyType === 'INDIVIDUAL' ? values.gender : undefined,
    birthDate: values.partyType === 'INDIVIDUAL' ? values.birthDate || undefined : undefined,
    birthPlace: values.partyType === 'INDIVIDUAL' ? values.birthPlace || undefined : undefined,
    nationality: values.partyType === 'INDIVIDUAL' ? values.nationality || undefined : undefined,
    idDocumentType: values.idDocumentType || undefined,
    idDocumentNumber: values.idDocumentNumber || undefined,
    idDocumentExpiry: values.idDocumentExpiry || undefined,
    profession: values.profession || undefined,
    employerName: values.employerName || undefined,
    monthlyIncome: values.monthlyIncome ?? undefined,
    primaryPhone: toE164Congo(values.primaryPhone) ?? values.primaryPhone,
    secondaryPhone: values.secondaryPhone
      ? (toE164Congo(values.secondaryPhone) ?? undefined)
      : undefined,
    whatsappPhone: values.whatsappPhone
      ? (toE164Congo(values.whatsappPhone) ?? undefined)
      : undefined,
    email: values.email || undefined,
    addressLine: values.addressLine || undefined,
    district: values.district || undefined,
    city: values.city || undefined,
    emergencyContactName: values.emergencyContactName || undefined,
    emergencyContactPhone: values.emergencyContactPhone
      ? (toE164Congo(values.emergencyContactPhone) ?? undefined)
      : undefined,
    notes: values.notes || undefined,
  };
}

function EditTenantSheet({
  tenant,
  open,
  onOpenChange,
}: {
  tenant: TenantDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateTenant = useUpdateTenant(tenant.id);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: buildDefaults(tenant),
  });

  const partyType = form.watch('partyType');

  React.useEffect(() => {
    if (open) {
      form.reset(buildDefaults(tenant));
      setServerError(null);
    }
  }, [open, tenant, form]);

  async function onSubmit(values: EditValues) {
    setServerError(null);
    try {
      await updateTenant.mutateAsync(buildTenantPatch(values));
      onOpenChange(false);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : genericErrorMessage);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Modifier le locataire</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <FormField
              control={form.control}
              name="partyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="edit-partyType">Type de tiers</FormLabel>
                  <FormControl>
                    <EnumSelect
                      id="edit-partyType"
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
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="edit-firstName">Prénom</FormLabel>
                      <FormControl>
                        <Input id="edit-firstName" {...field} />
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
                      <FormLabel htmlFor="edit-lastName">Nom</FormLabel>
                      <FormControl>
                        <Input id="edit-lastName" {...field} />
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
                    <FormLabel htmlFor="edit-companyName">Raison sociale</FormLabel>
                    <FormControl>
                      <Input id="edit-companyName" {...field} />
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
                      <FormLabel htmlFor="edit-gender">Sexe</FormLabel>
                      <FormControl>
                        <EnumSelect
                          id="edit-gender"
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
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="edit-birthDate">Date de naissance</FormLabel>
                        <FormControl>
                          <Input id="edit-birthDate" type="date" {...field} />
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
                        <FormLabel htmlFor="edit-birthPlace">Lieu de naissance</FormLabel>
                        <FormControl>
                          <Input id="edit-birthPlace" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="nationality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="edit-nationality">Nationalité</FormLabel>
                      <FormControl>
                        <Input id="edit-nationality" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="idDocumentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="edit-idDocumentType">Type de pièce</FormLabel>
                    <FormControl>
                      <EnumSelect
                        id="edit-idDocumentType"
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
                    <FormLabel htmlFor="edit-idDocumentNumber">Numéro de pièce</FormLabel>
                    <FormControl>
                      <Input id="edit-idDocumentNumber" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="idDocumentExpiry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="edit-idDocumentExpiry">Expiration de la pièce</FormLabel>
                  <FormControl>
                    <Input id="edit-idDocumentExpiry" type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="profession"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="edit-profession">Profession</FormLabel>
                    <FormControl>
                      <Input id="edit-profession" {...field} />
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
                    <FormLabel htmlFor="edit-employerName">Employeur</FormLabel>
                    <FormControl>
                      <Input id="edit-employerName" {...field} />
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
                  <FormLabel htmlFor="edit-monthlyIncome">Revenu mensuel (optionnel)</FormLabel>
                  <FormControl>
                    <MoneyInput
                      id="edit-monthlyIncome"
                      value={field.value ?? null}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="primaryPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="edit-primaryPhone">Téléphone principal</FormLabel>
                  <FormControl>
                    <PhoneInput
                      id="edit-primaryPhone"
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="secondaryPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="edit-secondaryPhone">Téléphone secondaire</FormLabel>
                    <FormControl>
                      <PhoneInput
                        id="edit-secondaryPhone"
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
                    <FormLabel htmlFor="edit-whatsappPhone">WhatsApp</FormLabel>
                    <FormControl>
                      <PhoneInput
                        id="edit-whatsappPhone"
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
                  <FormLabel htmlFor="edit-email">E-mail (optionnel)</FormLabel>
                  <FormControl>
                    <Input id="edit-email" type="email" {...field} />
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
                  <FormLabel htmlFor="edit-addressLine">Adresse</FormLabel>
                  <FormControl>
                    <Input id="edit-addressLine" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="edit-district">Quartier</FormLabel>
                    <FormControl>
                      <Input id="edit-district" {...field} />
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
                    <FormLabel htmlFor="edit-city">Ville</FormLabel>
                    <FormControl>
                      <Input id="edit-city" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="emergencyContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="edit-emergencyContactName">Contact d’urgence</FormLabel>
                    <FormControl>
                      <Input id="edit-emergencyContactName" {...field} />
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
                    <FormLabel htmlFor="edit-emergencyContactPhone">Téléphone d’urgence</FormLabel>
                    <FormControl>
                      <PhoneInput
                        id="edit-emergencyContactPhone"
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="edit-notes">Notes internes (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea id="edit-notes" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
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
              <Button type="submit" disabled={updateTenant.isPending}>
                {updateTenant.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

export function TenantIdentitySection({ tenant }: { tenant: TenantDetail }) {
  const [editOpen, setEditOpen] = React.useState(false);

  const identityRows: DetailRow[] = [
    { label: 'Type de tiers', value: PARTY_TYPE_LABELS[tenant.partyType] },
    { label: 'Nom', value: tenant.displayName },
  ];
  if (tenant.partyType === 'INDIVIDUAL') {
    identityRows.push(
      { label: 'Sexe', value: tenant.gender ? GENDER_LABELS[tenant.gender] : undefined },
      {
        label: 'Date de naissance',
        value: tenant.birthDate ? formatDateFr(tenant.birthDate) : undefined,
      },
      { label: 'Lieu de naissance', value: tenant.birthPlace },
      { label: 'Nationalité', value: tenant.nationality },
    );
  }
  identityRows.push(
    { label: 'Profession', value: tenant.profession },
    { label: 'Employeur', value: tenant.employerName },
    {
      label: 'Revenu mensuel',
      value: tenant.monthlyIncome != null ? <MoneyXaf amount={tenant.monthlyIncome} /> : undefined,
    },
    { label: 'Téléphone principal', value: <PhoneDisplay phone={tenant.primaryPhone} /> },
    {
      label: 'Téléphone secondaire',
      value: tenant.secondaryPhone ? <PhoneDisplay phone={tenant.secondaryPhone} /> : undefined,
    },
    {
      label: 'WhatsApp',
      value: tenant.whatsappPhone ? (
        <PhoneDisplay phone={tenant.whatsappPhone} whatsapp />
      ) : undefined,
    },
    { label: 'E-mail', value: tenant.email },
    {
      label: 'Contact d’urgence',
      value: tenant.emergencyContactName,
    },
    {
      label: 'Téléphone d’urgence',
      value: tenant.emergencyContactPhone ? (
        <PhoneDisplay phone={tenant.emergencyContactPhone} />
      ) : undefined,
    },
    { label: 'Notes', value: tenant.notes },
  );

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Identité</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 size-4" aria-hidden="true" />
            Modifier
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <DetailList rows={identityRows} />
          <AddressBlock
            addressLine={tenant.addressLine}
            district={tenant.district}
            city={tenant.city}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pièce d’identité</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList
            rows={[
              {
                label: 'Type',
                value: tenant.idDocumentType
                  ? ID_DOCUMENT_TYPE_LABELS[tenant.idDocumentType]
                  : undefined,
              },
              { label: 'Numéro', value: tenant.idDocumentNumber },
              {
                label: 'Expiration',
                value: tenant.idDocumentExpiry ? formatDateFr(tenant.idDocumentExpiry) : undefined,
              },
            ]}
          />
        </CardContent>
      </Card>

      <EditTenantSheet tenant={tenant} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
