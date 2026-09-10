'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/business/page-header';
import { EnumSelect } from '@/components/business/enum-select';
import { PhoneInput } from '@/components/business/phone-input';
import { useCreateProperty } from '@/lib/api/hooks/use-properties';
import { useLandlords } from '@/lib/api/hooks/use-landlords';
import { PROPERTY_TYPE_LABELS } from '@/lib/enum-labels';
import { toE164Congo } from '@/lib/phone';
import type { PropertyType } from '@/lib/api/types';

const schema = z.object({
  landlordId: z.string().min(1, 'Bailleur requis.'),
  name: z.string().min(2, 'Nom requis.'),
  propertyType: z
    .enum(Object.keys(PROPERTY_TYPE_LABELS) as [PropertyType, ...PropertyType[]])
    .optional(),
  addressLine: z.string().min(2, 'Adresse requise.'),
  district: z.string().min(1, 'Quartier requis.'),
  arrondissement: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().min(1, 'Ville requise.'),
  landTitleReference: z.string().optional(),
  parcelNumber: z.string().optional(),
  builtYear: z.string().optional(),
  totalAreaSqm: z.string().optional(),
  floorsCount: z.string().optional(),
  hasWater: z.boolean().optional(),
  hasElectricity: z.boolean().optional(),
  hasBorehole: z.boolean().optional(),
  caretakerName: z.string().optional(),
  caretakerPhone: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  landlordId: '',
  name: '',
  propertyType: undefined,
  addressLine: '',
  district: '',
  arrondissement: '',
  landmark: '',
  city: 'Brazzaville',
  landTitleReference: '',
  parcelNumber: '',
  builtYear: '',
  totalAreaSqm: '',
  floorsCount: '',
  hasWater: false,
  hasElectricity: false,
  hasBorehole: false,
  caretakerName: '',
  caretakerPhone: '',
  notes: '',
};

export default function NouvelImmeublePage() {
  const router = useRouter();
  const createProperty = useCreateProperty();
  const { data: landlordsData } = useLandlords({ limit: 100 });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });

  async function onSubmit(values: FormValues) {
    const caretakerPhone = values.caretakerPhone ? toE164Congo(values.caretakerPhone) : null;
    try {
      const property = await createProperty.mutateAsync({
        landlordId: values.landlordId,
        name: values.name,
        propertyType: values.propertyType,
        addressLine: values.addressLine,
        district: values.district,
        arrondissement: values.arrondissement || undefined,
        landmark: values.landmark || undefined,
        city: values.city || undefined,
        landTitleReference: values.landTitleReference || undefined,
        parcelNumber: values.parcelNumber || undefined,
        builtYear: values.builtYear ? Number(values.builtYear) : undefined,
        totalAreaSqm: values.totalAreaSqm ? Number(values.totalAreaSqm) : undefined,
        floorsCount: values.floorsCount ? Number(values.floorsCount) : undefined,
        hasWater: values.hasWater,
        hasElectricity: values.hasElectricity,
        hasBorehole: values.hasBorehole,
        caretakerName: values.caretakerName || undefined,
        caretakerPhone: caretakerPhone || undefined,
        notes: values.notes || undefined,
      });
      toast.success('Immeuble créé.');
      router.push(`/app/immeubles/${property.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de créer l'immeuble.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader title="Nouvel immeuble" description="Renseignez les informations du bien." />
      <Card>
        <CardContent className="space-y-6 pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
              <FormField
                control={form.control}
                name="landlordId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="landlordId">Bailleur</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger id="landlordId">
                          <SelectValue placeholder="Sélectionner un bailleur" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(landlordsData?.items ?? []).map((landlord) => (
                          <SelectItem key={landlord.id} value={landlord.id}>
                            {landlord.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="name">Nom de l&apos;immeuble</FormLabel>
                    <FormControl>
                      <Input id="name" placeholder="Résidence les Manguiers" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="propertyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="propertyType">Type de bien</FormLabel>
                    <FormControl>
                      <EnumSelect<PropertyType>
                        id="propertyType"
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                        labels={PROPERTY_TYPE_LABELS}
                        placeholder="Sélectionner un type"
                      />
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
                  name="arrondissement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="arrondissement">Arrondissement (optionnel)</FormLabel>
                      <FormControl>
                        <Input id="arrondissement" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="landmark"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="landmark">Repère (optionnel)</FormLabel>
                      <FormControl>
                        <Input id="landmark" placeholder="Près du marché Total" {...field} />
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
                        <Input id="city" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="landTitleReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="landTitleReference">Titre foncier (optionnel)</FormLabel>
                      <FormControl>
                        <Input id="landTitleReference" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="parcelNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="parcelNumber">N° de parcelle (optionnel)</FormLabel>
                      <FormControl>
                        <Input id="parcelNumber" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="builtYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="builtYear">Année de construction</FormLabel>
                      <FormControl>
                        <Input id="builtYear" type="number" min={1900} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="totalAreaSqm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="totalAreaSqm">Surface totale (m²)</FormLabel>
                      <FormControl>
                        <Input id="totalAreaSqm" type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="floorsCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="floorsCount">Nombre d&apos;étages</FormLabel>
                      <FormControl>
                        <Input id="floorsCount" type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-wrap gap-6">
                <FormField
                  control={form.control}
                  name="hasWater"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          id="hasWater"
                          checked={field.value ?? false}
                          onChange={(event) => field.onChange(event.target.checked)}
                        />
                      </FormControl>
                      <FormLabel htmlFor="hasWater" className="!mt-0">
                        Eau courante
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hasElectricity"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          id="hasElectricity"
                          checked={field.value ?? false}
                          onChange={(event) => field.onChange(event.target.checked)}
                        />
                      </FormControl>
                      <FormLabel htmlFor="hasElectricity" className="!mt-0">
                        Électricité
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hasBorehole"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          id="hasBorehole"
                          checked={field.value ?? false}
                          onChange={(event) => field.onChange(event.target.checked)}
                        />
                      </FormControl>
                      <FormLabel htmlFor="hasBorehole" className="!mt-0">
                        Forage
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="caretakerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="caretakerName">Gardien (optionnel)</FormLabel>
                      <FormControl>
                        <Input id="caretakerName" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="caretakerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="caretakerPhone">
                        Téléphone du gardien (optionnel)
                      </FormLabel>
                      <FormControl>
                        <PhoneInput
                          id="caretakerPhone"
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
                    <FormLabel htmlFor="notes">Notes (optionnel)</FormLabel>
                    <FormControl>
                      <Textarea id="notes" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createProperty.isPending}>
                  {createProperty.isPending ? 'Création…' : "Créer l'immeuble"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
