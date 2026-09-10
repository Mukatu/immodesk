'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { EnumSelect } from '@/components/business/enum-select';
import { MoneyInput } from '@/components/business/money-input';
import { useUpdateUnit } from '@/lib/api/hooks/use-units';
import { UNIT_STATUS_LABELS, UNIT_TYPE_LABELS } from '@/lib/enum-labels';
import type { UnitDetail, UnitStatus, UnitType } from '@/lib/api/types';

const editSchema = z
  .object({
    code: z.string().min(1, 'Code requis.'),
    label: z.string().optional(),
    unitType: z.enum(Object.keys(UNIT_TYPE_LABELS) as [UnitType, ...UnitType[]]).optional(),
    status: z.enum(Object.keys(UNIT_STATUS_LABELS) as [UnitStatus, ...UnitStatus[]]).optional(),
    floorNumber: z.string().optional(),
    roomsCount: z.string().optional(),
    bedroomsCount: z.string().optional(),
    bathroomsCount: z.string().optional(),
    areaSqm: z.string().optional(),
    isFurnished: z.boolean().optional(),
    hasPrivateMeter: z.boolean().optional(),
    baseRentAmount: z.number().int().positive().nullable(),
    baseChargesAmount: z.number().int().nonnegative().nullable().optional(),
    depositMonths: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.baseRentAmount === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['baseRentAmount'],
        message: 'Loyer de base requis.',
      });
    }
  });

type EditFormValues = z.infer<typeof editSchema>;

function unitToFormValues(unit: UnitDetail): EditFormValues {
  return {
    code: unit.code,
    label: unit.label ?? '',
    unitType: unit.unitType,
    status: unit.status,
    floorNumber: unit.floorNumber !== undefined ? String(unit.floorNumber) : '',
    roomsCount: unit.roomsCount !== undefined ? String(unit.roomsCount) : '',
    bedroomsCount: unit.bedroomsCount !== undefined ? String(unit.bedroomsCount) : '',
    bathroomsCount: unit.bathroomsCount !== undefined ? String(unit.bathroomsCount) : '',
    areaSqm: unit.areaSqm !== undefined ? String(unit.areaSqm) : '',
    isFurnished: unit.isFurnished ?? false,
    hasPrivateMeter: unit.hasPrivateMeter ?? false,
    baseRentAmount: unit.baseRentAmount ?? null,
    baseChargesAmount: unit.baseChargesAmount ?? null,
    depositMonths: unit.depositMonths !== undefined ? String(unit.depositMonths) : '',
    notes: unit.notes ?? '',
  };
}

export interface UnitEditSheetProps {
  unit: UnitDetail;
}

/** Volet latéral de modification d'un lot (sous-ensemble éditable de UnitInput). */
export function UnitEditSheet({ unit }: UnitEditSheetProps) {
  const [open, setOpen] = React.useState(false);
  const updateUnit = useUpdateUnit(unit.id);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: unitToFormValues(unit),
  });

  React.useEffect(() => {
    if (open) form.reset(unitToFormValues(unit));
  }, [open, unit, form]);

  async function onSubmit(values: EditFormValues) {
    try {
      await updateUnit.mutateAsync({
        code: values.code,
        label: values.label || undefined,
        unitType: values.unitType,
        status: values.status,
        floorNumber: values.floorNumber ? Number(values.floorNumber) : undefined,
        roomsCount: values.roomsCount ? Number(values.roomsCount) : undefined,
        bedroomsCount: values.bedroomsCount ? Number(values.bedroomsCount) : undefined,
        bathroomsCount: values.bathroomsCount ? Number(values.bathroomsCount) : undefined,
        areaSqm: values.areaSqm ? Number(values.areaSqm) : undefined,
        isFurnished: values.isFurnished,
        hasPrivateMeter: values.hasPrivateMeter,
        baseRentAmount: values.baseRentAmount as number,
        baseChargesAmount: values.baseChargesAmount ?? undefined,
        depositMonths: values.depositMonths ? Number(values.depositMonths) : undefined,
        notes: values.notes || undefined,
      });
      toast.success('Lot mis à jour.');
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de modifier ce lot.');
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline">
          <Pencil className="mr-2 size-4" aria-hidden="true" />
          Modifier
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Modifier le lot</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="unit-code">Code</FormLabel>
                    <FormControl>
                      <Input id="unit-code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="unit-label">Libellé (optionnel)</FormLabel>
                    <FormControl>
                      <Input id="unit-label" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="unitType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="unit-type">Type</FormLabel>
                    <FormControl>
                      <EnumSelect<UnitType>
                        id="unit-type"
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                        labels={UNIT_TYPE_LABELS}
                        placeholder="Sélectionner un type"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="unit-status">Statut</FormLabel>
                    <FormControl>
                      <EnumSelect<UnitStatus>
                        id="unit-status"
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                        labels={UNIT_STATUS_LABELS}
                        placeholder="Sélectionner un statut"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="baseRentAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="unit-rent">Loyer de base</FormLabel>
                    <FormControl>
                      <MoneyInput
                        id="unit-rent"
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
                name="baseChargesAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="unit-charges">Charges (optionnel)</FormLabel>
                    <FormControl>
                      <MoneyInput
                        id="unit-charges"
                        value={field.value ?? null}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <FormField
                control={form.control}
                name="roomsCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="unit-rooms">Pièces</FormLabel>
                    <FormControl>
                      <Input id="unit-rooms" type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bedroomsCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="unit-bedrooms">Chambres</FormLabel>
                    <FormControl>
                      <Input id="unit-bedrooms" type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bathroomsCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="unit-bathrooms">Douches/WC</FormLabel>
                    <FormControl>
                      <Input id="unit-bathrooms" type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="areaSqm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="unit-area">Surface (m²)</FormLabel>
                    <FormControl>
                      <Input id="unit-area" type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="floorNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="unit-floor">Étage (optionnel)</FormLabel>
                    <FormControl>
                      <Input id="unit-floor" type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="depositMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="unit-deposit">Caution (mois, optionnel)</FormLabel>
                    <FormControl>
                      <Input id="unit-deposit" type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-wrap gap-6">
              <FormField
                control={form.control}
                name="isFurnished"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        id="unit-furnished"
                        checked={field.value ?? false}
                        onChange={(event) => field.onChange(event.target.checked)}
                      />
                    </FormControl>
                    <FormLabel htmlFor="unit-furnished" className="!mt-0">
                      Meublé
                    </FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hasPrivateMeter"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        id="unit-meter"
                        checked={field.value ?? false}
                        onChange={(event) => field.onChange(event.target.checked)}
                      />
                    </FormControl>
                    <FormLabel htmlFor="unit-meter" className="!mt-0">
                      Compteur privatif
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="unit-notes">Notes (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea id="unit-notes" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter>
              <Button type="submit" disabled={updateUnit.isPending}>
                {updateUnit.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
