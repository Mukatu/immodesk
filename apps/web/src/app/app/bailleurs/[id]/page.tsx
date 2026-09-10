'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Pencil, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { PhoneDisplay } from '@/components/business/phone-display';
import { PhoneInput } from '@/components/business/phone-input';
import { AddressBlock } from '@/components/business/address-block';
import { BankAccountCard } from '@/components/business/bank-account-card';
import { EnumSelect } from '@/components/business/enum-select';
import { EmptyState } from '@/components/business/empty-state';
import { DocumentList, DocumentUploader } from '@/components/business/document-uploader';
import { useLandlord, useUpdateLandlord } from '@/lib/api/hooks/use-landlords';
import { useBankAccounts, useCreateBankAccount } from '@/lib/api/hooks/use-bank-accounts';
import { toE164Congo } from '@/lib/phone';
import {
  GENDER_LABELS,
  ID_DOCUMENT_TYPE_LABELS,
  PARTY_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
} from '@/lib/enum-labels';
import { ApiError } from '@/lib/api/client';
import type {
  Gender,
  IdDocumentType,
  LandlordDetail,
  PartyType,
  PaymentMethod,
} from '@/lib/api/types';

/** Formate une date ISO ("YYYY-MM-DD") en date lisible fr-CG ; retombe sur la valeur brute. */
function formatDateFr(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('fr-FR');
}

interface DetailRow {
  label: string;
  value?: string | null;
}

/** Bloc de définition (dl) affichant des paires libellé/valeur, en masquant les champs vides. */
function DetailList({ rows }: { rows: DetailRow[] }) {
  const filled = rows.filter((row) => Boolean(row.value && row.value.trim()));
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

const ID_DOCUMENT_TYPES: IdDocumentType[] = [
  'CNI',
  'PASSPORT',
  'RESIDENCE_PERMIT',
  'DRIVING_LICENSE',
  'VOTER_CARD',
  'RCCM',
  'NIU',
  'OTHER',
];

const editSchema = z
  .object({
    partyType: z.enum(['INDIVIDUAL', 'COMPANY']),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    companyName: z.string().optional(),
    gender: z.enum(['MALE', 'FEMALE', 'UNSPECIFIED']).optional(),
    birthDate: z.string().optional(),
    nationality: z.string().optional(),
    idDocumentType: z.enum(ID_DOCUMENT_TYPES as [IdDocumentType, ...IdDocumentType[]]).optional(),
    idDocumentNumber: z.string().optional(),
    idDocumentExpiry: z.string().optional(),
    rccmNumber: z.string().optional(),
    niuNumber: z.string().optional(),
    localPhone: z.string().refine((v) => toE164Congo(v) !== null, 'Numéro invalide.'),
    localSecondaryPhone: z
      .string()
      .optional()
      .refine((v) => !v || toE164Congo(v) !== null, 'Numéro invalide.'),
    email: z.string().email('Adresse e-mail invalide.').optional().or(z.literal('')),
    addressLine: z.string().optional(),
    district: z.string().optional(),
    city: z.string().optional(),
    payoutMethod: z.enum(['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'BANK_CHECK']).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.partyType === 'INDIVIDUAL' && !data.lastName?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['lastName'], message: 'Nom requis.' });
    }
    if (data.partyType === 'COMPANY' && !data.companyName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['companyName'],
        message: 'Raison sociale requise.',
      });
    }
  });

type EditValues = z.infer<typeof editSchema>;

function localFromE164(phone?: string | null): string {
  return phone && phone.startsWith('+242') ? phone.slice(4) : '';
}

function buildEditDefaults(landlord: LandlordDetail): EditValues {
  return {
    partyType: landlord.partyType,
    firstName: landlord.firstName ?? '',
    lastName: landlord.lastName ?? '',
    companyName: landlord.companyName ?? '',
    gender: landlord.gender,
    birthDate: landlord.birthDate ?? '',
    nationality: landlord.nationality ?? '',
    idDocumentType: landlord.idDocumentType,
    idDocumentNumber: landlord.idDocumentNumber ?? '',
    idDocumentExpiry: landlord.idDocumentExpiry ?? '',
    rccmNumber: landlord.rccmNumber ?? '',
    niuNumber: landlord.niuNumber ?? '',
    localPhone: localFromE164(landlord.primaryPhone),
    localSecondaryPhone: localFromE164(landlord.secondaryPhone),
    email: landlord.email ?? '',
    addressLine: landlord.addressLine ?? '',
    district: landlord.district ?? '',
    city: landlord.city ?? '',
    payoutMethod: landlord.payoutMethod,
  };
}

function EditLandlordSheet({
  landlord,
  open,
  onOpenChange,
}: {
  landlord: LandlordDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateLandlord = useUpdateLandlord(landlord.id);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: buildEditDefaults(landlord),
  });

  const partyType = form.watch('partyType');

  React.useEffect(() => {
    if (open) {
      form.reset(buildEditDefaults(landlord));
      setServerError(null);
    }
  }, [open, landlord, form]);

  async function onSubmit(values: EditValues) {
    setServerError(null);
    const phone = toE164Congo(values.localPhone);
    if (!phone) return;
    let secondaryPhone: string | undefined;
    if (values.localSecondaryPhone) {
      const converted = toE164Congo(values.localSecondaryPhone);
      if (!converted) return;
      secondaryPhone = converted;
    }
    try {
      await updateLandlord.mutateAsync({
        partyType: values.partyType,
        firstName: values.partyType === 'INDIVIDUAL' ? values.firstName || undefined : undefined,
        lastName: values.partyType === 'INDIVIDUAL' ? values.lastName || undefined : undefined,
        companyName: values.partyType === 'COMPANY' ? values.companyName || undefined : undefined,
        gender: values.gender,
        birthDate: values.birthDate || undefined,
        nationality: values.nationality || undefined,
        idDocumentType: values.idDocumentType,
        idDocumentNumber: values.idDocumentNumber || undefined,
        idDocumentExpiry: values.idDocumentExpiry || undefined,
        rccmNumber: values.rccmNumber || undefined,
        niuNumber: values.niuNumber || undefined,
        primaryPhone: phone,
        secondaryPhone,
        email: values.email || undefined,
        addressLine: values.addressLine || undefined,
        district: values.district || undefined,
        city: values.city || undefined,
        payoutMethod: values.payoutMethod,
      });
      onOpenChange(false);
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'Impossible de mettre à jour le bailleur.',
      );
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Modifier le bailleur</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <FormField
              control={form.control}
              name="partyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de bailleur</FormLabel>
                  <div className="flex gap-2" role="radiogroup" aria-label="Type de bailleur">
                    {(['INDIVIDUAL', 'COMPANY'] as PartyType[]).map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant={field.value === type ? 'default' : 'outline'}
                        role="radio"
                        aria-checked={field.value === type}
                        onClick={() => field.onChange(type)}
                        className="flex-1"
                      >
                        {type === 'INDIVIDUAL' ? 'Particulier' : 'Entreprise'}
                      </Button>
                    ))}
                  </div>
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

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="edit-gender">Genre</FormLabel>
                    <FormControl>
                      <EnumSelect<Gender>
                        id="edit-gender"
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                        labels={GENDER_LABELS}
                        placeholder="Choisir"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="idDocumentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="edit-idDocumentType">Type de pièce</FormLabel>
                    <FormControl>
                      <EnumSelect<IdDocumentType>
                        id="edit-idDocumentType"
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                        labels={ID_DOCUMENT_TYPE_LABELS}
                        placeholder="Choisir"
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

            <div className="grid grid-cols-2 gap-3">
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
              <FormField
                control={form.control}
                name="rccmNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="edit-rccmNumber">Numéro RCCM</FormLabel>
                    <FormControl>
                      <Input id="edit-rccmNumber" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="niuNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="edit-niuNumber">Numéro NIU</FormLabel>
                  <FormControl>
                    <Input id="edit-niuNumber" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="localPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="edit-phone">Téléphone principal</FormLabel>
                  <FormControl>
                    <PhoneInput
                      id="edit-phone"
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="localSecondaryPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="edit-secondaryPhone">
                    Téléphone secondaire (optionnel)
                  </FormLabel>
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
            </div>

            <FormField
              control={form.control}
              name="payoutMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="edit-payout">Mode de versement (optionnel)</FormLabel>
                  <FormControl>
                    <EnumSelect<PaymentMethod>
                      id="edit-payout"
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      labels={PAYMENT_METHOD_LABELS}
                      placeholder="Choisir un mode"
                    />
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

            <SheetFooter>
              <Button type="submit" disabled={updateLandlord.isPending}>
                {updateLandlord.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

const bankAccountSchema = z.object({
  label: z.string().min(1, 'Libellé requis.'),
  bankCode: z.string().min(1, 'Code banque requis.'),
  bankName: z.string().min(1, 'Nom de la banque requis.'),
  accountHolderName: z.string().min(1, 'Titulaire requis.'),
  accountNumber: z.string().optional(),
});

type BankAccountValues = z.infer<typeof bankAccountSchema>;

const BANK_ACCOUNT_DEFAULTS: BankAccountValues = {
  label: '',
  bankCode: '',
  bankName: '',
  accountHolderName: '',
  accountNumber: '',
};

function AddBankAccountDialog({ landlordId }: { landlordId: string }) {
  const [open, setOpen] = React.useState(false);
  const createBankAccount = useCreateBankAccount();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<BankAccountValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: BANK_ACCOUNT_DEFAULTS,
  });

  async function onSubmit(values: BankAccountValues) {
    setServerError(null);
    try {
      await createBankAccount.mutateAsync({
        holderType: 'LANDLORD',
        landlordId,
        label: values.label,
        bankCode: values.bankCode,
        bankName: values.bankName,
        accountHolderName: values.accountHolderName,
        accountNumber: values.accountNumber || undefined,
      });
      form.reset(BANK_ACCOUNT_DEFAULTS);
      setOpen(false);
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Impossible d'ajouter ce compte bancaire.",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset(BANK_ACCOUNT_DEFAULTS);
          setServerError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus className="mr-2 size-4" aria-hidden="true" />
          Ajouter un compte
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un compte bancaire</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="bank-label">Libellé</FormLabel>
                  <FormControl>
                    <Input id="bank-label" placeholder="Compte principal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="bankCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="bank-code">Code banque</FormLabel>
                    <FormControl>
                      <Input id="bank-code" placeholder="BGFI" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="bank-name">Nom de la banque</FormLabel>
                    <FormControl>
                      <Input id="bank-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="accountHolderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="bank-holder">Titulaire du compte</FormLabel>
                  <FormControl>
                    <Input id="bank-holder" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="bank-number">Numéro de compte (optionnel)</FormLabel>
                  <FormControl>
                    <Input id="bank-number" {...field} />
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
            <DialogFooter>
              <Button type="submit" disabled={createBankAccount.isPending}>
                {createBankAccount.isPending ? 'Ajout…' : 'Ajouter le compte'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function LandlordDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: landlord, isLoading, error } = useLandlord(id);
  const { data: bankAccountsData } = useBankAccounts({ holderType: 'LANDLORD', landlordId: id });
  const [editOpen, setEditOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        icon={Building2}
        title="Bailleur introuvable"
        description="Ce bailleur n'existe pas ou a été supprimé."
        action={
          <Button asChild variant="outline">
            <Link href="/app/bailleurs">Retour à la liste des bailleurs</Link>
          </Button>
        }
      />
    );
  }

  if (error || !landlord) {
    return (
      <EmptyState
        title="Impossible de charger ce bailleur"
        description={error instanceof Error ? error.message : undefined}
      />
    );
  }

  const bankAccounts = bankAccountsData?.items ?? landlord.bankAccounts;

  return (
    <div className="space-y-6">
      <PageHeader
        title={landlord.displayName}
        description={PARTY_TYPE_LABELS[landlord.partyType]}
        actions={
          <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 size-4" aria-hidden="true" />
            Modifier
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Identité</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList
            rows={[
              { label: 'Type', value: PARTY_TYPE_LABELS[landlord.partyType] },
              { label: 'Nom / raison sociale', value: landlord.displayName },
              { label: 'Genre', value: landlord.gender ? GENDER_LABELS[landlord.gender] : null },
              {
                label: 'Date de naissance',
                value: landlord.birthDate ? formatDateFr(landlord.birthDate) : null,
              },
              { label: 'Nationalité', value: landlord.nationality },
              {
                label: 'Type de pièce',
                value: landlord.idDocumentType
                  ? ID_DOCUMENT_TYPE_LABELS[landlord.idDocumentType]
                  : null,
              },
              { label: 'Numéro de pièce', value: landlord.idDocumentNumber },
              {
                label: 'Expiration de la pièce',
                value: landlord.idDocumentExpiry ? formatDateFr(landlord.idDocumentExpiry) : null,
              },
              { label: 'RCCM', value: landlord.rccmNumber },
              { label: 'NIU', value: landlord.niuNumber },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coordonnées</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1 text-sm">
            <p className="font-medium text-muted-foreground">Téléphone principal</p>
            <PhoneDisplay phone={landlord.primaryPhone} whatsapp />
          </div>
          {landlord.secondaryPhone ? (
            <div className="space-y-1 text-sm">
              <p className="font-medium text-muted-foreground">Téléphone secondaire</p>
              <PhoneDisplay phone={landlord.secondaryPhone} whatsapp />
            </div>
          ) : null}
          {landlord.email ? (
            <div className="space-y-1 text-sm">
              <p className="font-medium text-muted-foreground">E-mail</p>
              <a href={`mailto:${landlord.email}`} className="hover:underline">
                {landlord.email}
              </a>
            </div>
          ) : null}
          <AddressBlock
            addressLine={landlord.addressLine}
            district={landlord.district}
            city={landlord.city}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle>Comptes bancaires</CardTitle>
          <AddBankAccountDialog landlordId={landlord.id} />
        </CardHeader>
        <CardContent>
          {bankAccounts.length === 0 ? (
            <EmptyState title="Aucun compte bancaire" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {bankAccounts.map((account) => (
                <BankAccountCard key={account.id} account={account} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Biens rattachés</CardTitle>
        </CardHeader>
        <CardContent>
          {landlord.properties.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Aucun bien rattaché"
              description="Les immeubles de ce bailleur apparaîtront ici."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {landlord.properties.map((property) => (
                <Link
                  key={property.id}
                  href={`/app/immeubles/${property.id}`}
                  className="block rounded-lg border border-border p-4 transition-colors hover:border-primary/60"
                >
                  <p className="font-medium text-foreground">{property.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {[property.district, property.city].filter(Boolean).join(', ')}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DocumentUploader relatedEntityType="landlord" relatedEntityId={id} kind="ID_DOCUMENT" />
          <DocumentList relatedEntityType="landlord" relatedEntityId={id} />
        </CardContent>
      </Card>

      <EditLandlordSheet landlord={landlord} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
