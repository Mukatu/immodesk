'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PageHeader } from '@/components/business/page-header';
import { DataTable } from '@/components/business/data-table';
import { PhoneDisplay } from '@/components/business/phone-display';
import { PhoneInput } from '@/components/business/phone-input';
import { EnumSelect } from '@/components/business/enum-select';
import { useCreateLandlord, useLandlords } from '@/lib/api/hooks/use-landlords';
import { toE164Congo } from '@/lib/phone';
import { PAYMENT_METHOD_LABELS } from '@/lib/enum-labels';
import type { Landlord, PartyType, PaymentMethod } from '@/lib/api/types';

/** Repousse la mise à jour d'une valeur de `delayMs` millisecondes (anti-rebond). */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

const createSchema = z
  .object({
    partyType: z.enum(['INDIVIDUAL', 'COMPANY']),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    companyName: z.string().optional(),
    localPhone: z.string().refine((v) => toE164Congo(v) !== null, 'Numéro invalide.'),
    city: z.string().optional(),
    district: z.string().optional(),
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

type CreateValues = z.infer<typeof createSchema>;

const DEFAULT_VALUES: CreateValues = {
  partyType: 'INDIVIDUAL',
  firstName: '',
  lastName: '',
  companyName: '',
  localPhone: '',
  city: '',
  district: '',
  payoutMethod: undefined,
};

function CreateLandlordSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const createLandlord = useCreateLandlord();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const partyType = form.watch('partyType');

  React.useEffect(() => {
    if (!open) {
      form.reset(DEFAULT_VALUES);
      setServerError(null);
    }
  }, [open, form]);

  async function onSubmit(values: CreateValues) {
    setServerError(null);
    const phone = toE164Congo(values.localPhone);
    if (!phone) return;
    try {
      const landlord = await createLandlord.mutateAsync({
        partyType: values.partyType,
        firstName: values.partyType === 'INDIVIDUAL' ? values.firstName || undefined : undefined,
        lastName: values.partyType === 'INDIVIDUAL' ? values.lastName || undefined : undefined,
        companyName: values.partyType === 'COMPANY' ? values.companyName || undefined : undefined,
        primaryPhone: phone,
        city: values.city || undefined,
        district: values.district || undefined,
        payoutMethod: values.payoutMethod,
      });
      onOpenChange(false);
      router.push(`/app/bailleurs/${landlord.id}`);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Impossible de créer le bailleur.');
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nouveau bailleur</SheetTitle>
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
                      <FormLabel htmlFor="landlord-firstName">Prénom</FormLabel>
                      <FormControl>
                        <Input id="landlord-firstName" {...field} />
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
                      <FormLabel htmlFor="landlord-lastName">Nom</FormLabel>
                      <FormControl>
                        <Input id="landlord-lastName" {...field} />
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
                    <FormLabel htmlFor="landlord-companyName">Raison sociale</FormLabel>
                    <FormControl>
                      <Input id="landlord-companyName" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="localPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="landlord-phone">Téléphone</FormLabel>
                  <FormControl>
                    <PhoneInput
                      id="landlord-phone"
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
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="landlord-city">Ville</FormLabel>
                    <FormControl>
                      <Input id="landlord-city" placeholder="Brazzaville" {...field} />
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
                    <FormLabel htmlFor="landlord-district">Quartier</FormLabel>
                    <FormControl>
                      <Input id="landlord-district" {...field} />
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
                  <FormLabel htmlFor="landlord-payout">Mode de versement (optionnel)</FormLabel>
                  <FormControl>
                    <EnumSelect<PaymentMethod>
                      id="landlord-payout"
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
              <Button type="submit" disabled={createLandlord.isPending}>
                {createLandlord.isPending ? 'Création…' : 'Créer le bailleur'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

export default function BailleursPage() {
  const [search, setSearch] = React.useState('');
  const [city, setCity] = React.useState('');
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);
  const debouncedCity = useDebouncedValue(city, 300);

  const { data, isLoading } = useLandlords({ q: debouncedSearch, city: debouncedCity });

  const columns = React.useMemo<ColumnDef<Landlord>[]>(
    () => [
      {
        header: 'Nom',
        accessorKey: 'displayName',
        cell: ({ row }) => (
          <Link href={`/app/bailleurs/${row.original.id}`} className="font-medium hover:underline">
            {row.original.displayName}
          </Link>
        ),
      },
      {
        header: 'Téléphone',
        cell: ({ row }) => <PhoneDisplay phone={row.original.primaryPhone} />,
      },
      {
        header: 'Ville',
        accessorKey: 'city',
      },
      {
        header: 'Biens',
        cell: ({ row }) => row.original.propertiesCount,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bailleurs"
        description="Propriétaires des biens gérés sur Immodesk."
        actions={
          <Button type="button" onClick={() => setSheetOpen(true)}>
            <Plus className="mr-2 size-4" aria-hidden="true" />
            Nouveau bailleur
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un bailleur…"
          aria-label="Rechercher un bailleur"
          className="sm:max-w-xs"
        />
        <Input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Ville"
          aria-label="Filtrer par ville"
          className="sm:max-w-xs"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyTitle="Aucun bailleur"
        emptyDescription="Créez votre premier bailleur pour commencer."
      />

      <CreateLandlordSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
