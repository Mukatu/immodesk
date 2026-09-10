'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Layers } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { EnumSelect } from '@/components/business/enum-select';
import { MoneyInput } from '@/components/business/money-input';
import { useBulkCreateUnits } from '@/lib/api/hooks/use-units';
import { UNIT_TYPE_LABELS } from '@/lib/enum-labels';
import type { UnitType } from '@/lib/api/types';

const bulkSchema = z
  .object({
    prefix: z.string().min(1, 'Préfixe requis.').max(10),
    from: z.string().min(1, 'Requis.'),
    to: z.string().min(1, 'Requis.'),
    padding: z.string().optional(),
    unitType: z.enum(Object.keys(UNIT_TYPE_LABELS) as [UnitType, ...UnitType[]]).optional(),
    baseRentAmount: z.number().int().positive().nullable(),
    baseChargesAmount: z.number().int().nonnegative().nullable().optional(),
    roomsCount: z.string().optional(),
    bedroomsCount: z.string().optional(),
    bathroomsCount: z.string().optional(),
    areaSqm: z.string().optional(),
    isFurnished: z.boolean().optional(),
  })
  .superRefine((values, ctx) => {
    const from = Number(values.from);
    const to = Number(values.to);
    if (!Number.isInteger(from) || from < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['from'], message: 'Nombre entier ≥ 1.' });
    }
    if (!Number.isInteger(to) || to < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'Nombre entier ≥ 1.' });
    }
    if (Number.isInteger(from) && Number.isInteger(to) && from >= 1 && to >= 1) {
      if (to < from) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'Doit être ≥ « De ».' });
      } else if (to - from + 1 > 200) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['to'],
          message: '200 lots maximum par série.',
        });
      }
    }
    if (values.baseRentAmount === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['baseRentAmount'],
        message: 'Loyer de base requis.',
      });
    }
  });

type BulkFormValues = z.infer<typeof bulkSchema>;

const DEFAULT_VALUES: BulkFormValues = {
  prefix: 'A',
  from: '1',
  to: '10',
  padding: '2',
  unitType: undefined,
  baseRentAmount: null,
  baseChargesAmount: null,
  roomsCount: '',
  bedroomsCount: '',
  bathroomsCount: '',
  areaSqm: '',
  isFurnished: false,
};

function buildCode(prefix: string, num: number, padding: number): string {
  return `${prefix}${String(num).padStart(padding, '0')}`;
}

export interface BulkUnitsDialogProps {
  propertyId: string;
}

/** Dialogue de création de lots en série (ex. A01…A12) à partir d'un gabarit commun. */
export function BulkUnitsDialog({ propertyId }: BulkUnitsDialogProps) {
  const [open, setOpen] = React.useState(false);
  const bulkCreateUnits = useBulkCreateUnits(propertyId);

  const form = useForm<BulkFormValues>({
    resolver: zodResolver(bulkSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const [prefix, from, to, padding] = form.watch(['prefix', 'from', 'to', 'padding']);
  const preview = React.useMemo(() => {
    const fromNum = Number(from);
    const toNum = Number(to);
    const paddingNum = Number(padding || '0') || 0;
    if (!Number.isInteger(fromNum) || !Number.isInteger(toNum) || fromNum < 1 || toNum < fromNum) {
      return null;
    }
    return `${buildCode(prefix || '', fromNum, paddingNum)}…${buildCode(prefix || '', toNum, paddingNum)}`;
  }, [prefix, from, to, padding]);

  async function onSubmit(values: BulkFormValues) {
    try {
      const result = await bulkCreateUnits.mutateAsync({
        prefix: values.prefix,
        from: Number(values.from),
        to: Number(values.to),
        padding: values.padding ? Number(values.padding) : undefined,
        template: {
          unitType: values.unitType,
          baseRentAmount: values.baseRentAmount as number,
          baseChargesAmount: values.baseChargesAmount ?? undefined,
          roomsCount: values.roomsCount ? Number(values.roomsCount) : undefined,
          bedroomsCount: values.bedroomsCount ? Number(values.bedroomsCount) : undefined,
          bathroomsCount: values.bathroomsCount ? Number(values.bathroomsCount) : undefined,
          areaSqm: values.areaSqm ? Number(values.areaSqm) : undefined,
          isFurnished: values.isFurnished,
        },
      });
      toast.success(`${result.created.length} lot(s) créé(s).`);
      form.reset(DEFAULT_VALUES);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de créer les lots.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Layers className="mr-2 size-4" aria-hidden="true" />
          Créer des lots en série
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Créer des lots en série</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <FormField
                control={form.control}
                name="prefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="bulk-prefix">Préfixe</FormLabel>
                    <FormControl>
                      <Input id="bulk-prefix" placeholder="A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="bulk-from">De</FormLabel>
                    <FormControl>
                      <Input id="bulk-from" type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="bulk-to">À</FormLabel>
                    <FormControl>
                      <Input id="bulk-to" type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="padding"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="bulk-padding">Zéros (ex. 2)</FormLabel>
                    <FormControl>
                      <Input id="bulk-padding" type="number" min={0} max={6} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <p className="text-sm text-muted-foreground" aria-live="polite">
              {preview
                ? `Codes générés : ${preview}`
                : 'Renseignez « De » et « À » pour prévisualiser les codes.'}
            </p>

            <FormField
              control={form.control}
              name="unitType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="bulk-unit-type">Type de lot</FormLabel>
                  <FormControl>
                    <EnumSelect<UnitType>
                      id="bulk-unit-type"
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="baseRentAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="bulk-rent">Loyer de base</FormLabel>
                    <FormControl>
                      <MoneyInput
                        id="bulk-rent"
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
                    <FormLabel htmlFor="bulk-charges">Charges (optionnel)</FormLabel>
                    <FormControl>
                      <MoneyInput
                        id="bulk-charges"
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
                    <FormLabel htmlFor="bulk-rooms">Pièces</FormLabel>
                    <FormControl>
                      <Input id="bulk-rooms" type="number" min={0} {...field} />
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
                    <FormLabel htmlFor="bulk-bedrooms">Chambres</FormLabel>
                    <FormControl>
                      <Input id="bulk-bedrooms" type="number" min={0} {...field} />
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
                    <FormLabel htmlFor="bulk-bathrooms">Douches/WC</FormLabel>
                    <FormControl>
                      <Input id="bulk-bathrooms" type="number" min={0} {...field} />
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
                    <FormLabel htmlFor="bulk-area">Surface (m²)</FormLabel>
                    <FormControl>
                      <Input id="bulk-area" type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isFurnished"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      id="bulk-furnished"
                      checked={field.value ?? false}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                  </FormControl>
                  <FormLabel htmlFor="bulk-furnished" className="!mt-0">
                    Meublé
                  </FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={bulkCreateUnits.isPending}>
                {bulkCreateUnits.isPending ? 'Création…' : 'Créer les lots'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
