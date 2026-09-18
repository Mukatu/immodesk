'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PhoneInput } from '@/components/business/phone-input';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { toE164Congo } from '@/lib/phone';
import { useCreateReferralPartner } from '@/lib/api/hooks/use-referral';

const schema = z.object({
  displayName: z.string().min(2, 'Indiquez le nom à afficher aux filleuls.'),
  localPhone: z.string().refine((v) => toE164Congo(v) !== null, 'Numéro invalide.'),
});
type FormValues = z.infer<typeof schema>;

/**
 * `ReferralPartnerInput` ne porte que `displayName` et `phone` (contrat) :
 * le fournisseur et le numéro Mobile Money ne sont renseignés qu'à
 * l'activation (`referral_partners_verified_chk`), aucune route ne permet à
 * ce jour au partenaire de les saisir lui-même. Au Congo un numéro mobile
 * sert aussi de compte Mobile Money : ce même numéro est donc présenté ici
 * comme le contact de versement.
 */
export function PartnerRegistrationForm() {
  const createPartner = useCreateReferralPartner();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: '', localPhone: '' },
  });

  async function onSubmit(values: FormValues) {
    const phone = toE164Congo(values.localPhone);
    if (!phone) return;
    try {
      await createPartner.mutateAsync({ displayName: values.displayName, phone });
      toast.success('Inscription enregistrée. Votre code de parrainage a été généré.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Devenir partenaire</CardTitle>
        <CardDescription>
          Apportez des bailleurs ou des agences à Immodesk et percevez une commission sur leur
          abonnement. L&apos;inscription est ouverte à tout utilisateur Immodesk.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="partner-display-name">Nom à afficher</FormLabel>
                  <FormControl>
                    <Input id="partner-display-name" placeholder="Ex. Jeanne Malonga" {...field} />
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
                  <FormLabel htmlFor="partner-phone">
                    Téléphone (aussi votre contact Mobile Money)
                  </FormLabel>
                  <FormControl>
                    <PhoneInput
                      id="partner-phone"
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={createPartner.isPending}>
              {createPartner.isPending ? 'Inscription…' : "M'inscrire comme partenaire"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
