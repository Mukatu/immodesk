'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Home, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PhoneInput } from '@/components/business/phone-input';
import { PageHeader } from '@/components/business/page-header';
import { cn } from '@/lib/utils';
import { toE164Congo } from '@/lib/phone';
import { useAuth } from '@/lib/auth/auth-context';
import { useCreateOrganization } from '@/lib/api/hooks/use-organizations';
import type { OrganizationType } from '@/lib/api/types';

const ORG_TYPES: Array<{
  value: OrganizationType;
  icon: typeof Building2;
  title: string;
  description: string;
}> = [
  {
    value: 'AGENCY',
    icon: Building2,
    title: 'Agence immobilière',
    description: 'Vous gérez des biens pour le compte de plusieurs bailleurs, avec une équipe.',
  },
  {
    value: 'INDEPENDENT_LANDLORD',
    icon: Home,
    title: 'Bailleur indépendant',
    description: 'Vous gérez uniquement vos propres biens, sans structure d’agence.',
  },
  {
    value: 'INDEPENDENT_MANAGER',
    icon: Users,
    title: 'Gestionnaire indépendant',
    description:
      'Démarcheur ou gestionnaire informel : vous gérez des biens pour d’autres bailleurs, seul ou en petite équipe.',
  },
];

const schema = z.object({
  type: z.enum(['AGENCY', 'INDEPENDENT_LANDLORD', 'INDEPENDENT_MANAGER']),
  legalName: z.string().min(2, 'Raison sociale requise.'),
  tradeName: z.string().optional(),
  city: z.string().min(2, 'Ville requise.'),
  district: z.string().optional(),
  localPhone: z.string().refine((v) => toE164Congo(v) !== null, 'Numéro invalide.'),
  contactEmail: z.string().email('Adresse e-mail invalide.').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

const STEP_LABELS = ['Type d’organisation', 'Identité', 'Contact'];

export default function OnboardingOrganisationPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const createOrganization = useCreateOrganization();
  const [stepIndex, setStepIndex] = React.useState(0);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'AGENCY',
      legalName: '',
      tradeName: '',
      city: '',
      district: '',
      localPhone: '',
      contactEmail: '',
    },
    mode: 'onChange',
  });

  async function goNext() {
    const fieldsByStep: Array<Array<keyof FormValues>> = [
      ['type'],
      ['legalName', 'tradeName', 'city', 'district'],
      ['localPhone', 'contactEmail'],
    ];
    const valid = await form.trigger(fieldsByStep[stepIndex]);
    if (!valid) return;
    if (stepIndex < STEP_LABELS.length - 1) {
      setStepIndex((s) => s + 1);
    } else {
      await onSubmit(form.getValues());
    }
  }

  function goPrevious() {
    setStepIndex((s) => Math.max(0, s - 1));
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const phone = toE164Congo(values.localPhone);
    if (!phone) return;
    try {
      await createOrganization.mutateAsync({
        type: values.type,
        legalName: values.legalName,
        tradeName: values.tradeName || undefined,
        city: values.city,
        district: values.district || undefined,
        contactPhone: phone,
        contactEmail: values.contactEmail || undefined,
      });
      await refresh();
      router.push('/app');
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'Impossible de créer l’organisation.',
      );
    }
  }

  return (
    <main id="contenu-principal" className="mx-auto max-w-2xl px-4 py-10">
      <PageHeader
        title="Créer votre organisation"
        description="Trois étapes rapides pour démarrer sur Immodesk."
      />
      <ol className="my-6 flex items-center gap-2 text-xs text-muted-foreground" aria-label="Étapes">
        {STEP_LABELS.map((label, index) => (
          <li
            key={label}
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-1',
              index === stepIndex
                ? 'border-primary text-primary font-medium'
                : 'border-border',
            )}
            aria-current={index === stepIndex ? 'step' : undefined}
          >
            <span>{index + 1}.</span>
            {label}
          </li>
        ))}
      </ol>

      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void goNext();
          }}
          className="space-y-6"
          noValidate
        >
          {stepIndex === 0 && (
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type d’organisation</FormLabel>
                  <div className="grid gap-3 sm:grid-cols-1" role="radiogroup" aria-label="Type d’organisation">
                    {ORG_TYPES.map(({ value, icon: Icon, title, description }) => {
                      const selected = field.value === value;
                      return (
                        <Card
                          key={value}
                          role="radio"
                          aria-checked={selected}
                          tabIndex={0}
                          onClick={() => field.onChange(value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              field.onChange(value);
                            }
                          }}
                          className={cn(
                            'cursor-pointer transition-colors hover:border-primary/60',
                            selected && 'border-primary ring-1 ring-primary',
                          )}
                        >
                          <CardHeader className="flex-row items-start gap-3 space-y-0">
                            <Icon className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
                            <div>
                              <CardTitle className="text-base">{title}</CardTitle>
                              <CardDescription>{description}</CardDescription>
                            </div>
                          </CardHeader>
                        </Card>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {stepIndex === 1 && (
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="legalName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="legalName">Raison sociale</FormLabel>
                    <FormControl>
                      <Input id="legalName" placeholder="Agence Mpila Immo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tradeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="tradeName">Nom commercial (optionnel)</FormLabel>
                    <FormControl>
                      <Input id="tradeName" {...field} />
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
              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="district">Quartier / arrondissement (optionnel)</FormLabel>
                    <FormControl>
                      <Input id="district" placeholder="Mpila" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {stepIndex === 2 && (
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="localPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="contact-phone">Téléphone de contact</FormLabel>
                    <FormControl>
                      <PhoneInput
                        id="contact-phone"
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
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="contact-email">E-mail de contact (optionnel)</FormLabel>
                    <FormControl>
                      <Input id="contact-email" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {serverError ? (
            <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
              {serverError}
            </p>
          ) : null}

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={goPrevious} disabled={stepIndex === 0}>
              Précédent
            </Button>
            <Button type="submit" disabled={createOrganization.isPending}>
              {stepIndex === STEP_LABELS.length - 1
                ? createOrganization.isPending
                  ? 'Création…'
                  : 'Créer l’organisation'
                : 'Suivant'}
            </Button>
          </div>
        </form>
      </Form>
    </main>
  );
}
