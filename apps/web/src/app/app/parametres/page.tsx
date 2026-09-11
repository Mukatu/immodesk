'use client';

import * as React from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PageHeader } from '@/components/business/page-header';
import { useAuth } from '@/lib/auth/auth-context';
import {
  useOrganization,
  useOrganizationSettings,
  useUpdateOrganization,
  useUpdateOrganizationSettings,
} from '@/lib/api/hooks/use-organizations';

const identitySchema = z.object({
  legalName: z.string().min(2, 'Raison sociale requise.'),
  tradeName: z.string().optional(),
  city: z.string().min(2, 'Ville requise.'),
  district: z.string().optional(),
  contactEmail: z.string().email('Adresse e-mail invalide.').optional().or(z.literal('')),
});

type IdentityValues = z.infer<typeof identitySchema>;

export default function ParametresPage() {
  const { currentOrganizationId } = useAuth();
  const { data: organization, isLoading: loadingOrg } = useOrganization(currentOrganizationId);
  const { data: settings, isLoading: loadingSettings } =
    useOrganizationSettings(currentOrganizationId);
  const updateOrganization = useUpdateOrganization(currentOrganizationId);
  const updateSettings = useUpdateOrganizationSettings(currentOrganizationId);

  const form = useForm<IdentityValues>({
    resolver: zodResolver(identitySchema),
    values: organization
      ? {
          legalName: organization.legalName,
          tradeName: organization.tradeName ?? '',
          city: organization.city,
          district: organization.district ?? '',
          contactEmail: organization.contactEmail ?? '',
        }
      : undefined,
  });

  const [dueDay, setDueDay] = React.useState(5);
  const [graceDays, setGraceDays] = React.useState(3);
  const [footerText, setFooterText] = React.useState('');

  React.useEffect(() => {
    if (settings) {
      setDueDay(settings.defaultPaymentDueDay);
      setGraceDays(settings.defaultGraceDays);
      setFooterText(settings.receiptFooterText ?? '');
    }
  }, [settings]);

  async function onSubmitIdentity(values: IdentityValues) {
    try {
      await updateOrganization.mutateAsync({
        legalName: values.legalName,
        tradeName: values.tradeName || undefined,
        city: values.city,
        district: values.district || undefined,
        contactEmail: values.contactEmail || undefined,
      });
      toast.success('Organisation mise à jour.');
    } catch {
      toast.error('Impossible de mettre à jour l’organisation.');
    }
  }

  async function onSubmitSettings(event: React.FormEvent) {
    event.preventDefault();
    try {
      await updateSettings.mutateAsync({
        defaultPaymentDueDay: dueDay,
        defaultGraceDays: graceDays,
        receiptFooterText: footerText || null,
      });
      toast.success('Paramètres mis à jour.');
    } catch {
      toast.error('Impossible de mettre à jour les paramètres.');
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Paramètres"
        description="Identité de l’organisation et réglages de facturation."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/app/parametres/facturation"
          className="rounded-md border border-border p-4 hover:bg-accent"
        >
          <p className="font-medium">Facturation, caisse et messagerie</p>
          <p className="text-sm text-muted-foreground">
            Génération des factures, plafond de caisse, règles de pénalité.
          </p>
        </Link>
        <Link
          href="/app/parametres/messages"
          className="rounded-md border border-border p-4 hover:bg-accent"
        >
          <p className="font-medium">Gabarits de messages</p>
          <p className="text-sm text-muted-foreground">
            Corps des messages WhatsApp et SMS envoyés aux locataires.
          </p>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identité</CardTitle>
          <CardDescription>
            Informations affichées sur les documents et communications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingOrg ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitIdentity)} className="space-y-4" noValidate>
                <FormField
                  control={form.control}
                  name="legalName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="legalName">Raison sociale</FormLabel>
                      <FormControl>
                        <Input id="legalName" {...field} />
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
                      <FormLabel htmlFor="tradeName">Nom commercial</FormLabel>
                      <FormControl>
                        <Input id="tradeName" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
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
                  <FormField
                    control={form.control}
                    name="district"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="district">Quartier / arrondissement</FormLabel>
                        <FormControl>
                          <Input id="district" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="contactEmail">E-mail de contact</FormLabel>
                      <FormControl>
                        <Input id="contactEmail" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={updateOrganization.isPending}>
                  {updateOrganization.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Facturation</CardTitle>
          <CardDescription>
            Fuseau horaire fixe : Africa/Brazzaville. Devise fixe : XAF.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSettings ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <form onSubmit={onSubmitSettings} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dueDay">Jour d’échéance par défaut</Label>
                  <Input
                    id="dueDay"
                    type="number"
                    min={1}
                    max={28}
                    value={dueDay}
                    onChange={(e) => setDueDay(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="graceDays">Jours de grâce</Label>
                  <Input
                    id="graceDays"
                    type="number"
                    min={0}
                    max={30}
                    value={graceDays}
                    onChange={(e) => setGraceDays(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerText">Texte de pied de quittance</Label>
                <Input
                  id="footerText"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="Merci pour votre confiance."
                />
              </div>
              <Button type="submit" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
