'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Copy, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { PhoneInput } from '@/components/business/phone-input';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { toE164Congo, digitsOnly } from '@/lib/phone';
import { useRegisterReferralProperty } from '@/lib/api/hooks/use-referral';
import type { ReferralPropertyRegistrationAccepted } from '@/lib/api/types';

const schema = z.object({
  propertyName: z.string().min(2, 'Nom du bien requis.'),
  propertyCity: z.string().min(2, 'Ville requise.'),
  propertyAddressLine: z.string().min(2, 'Adresse requise.'),
  landlordLocalPhone: z.string().refine((v) => toE164Congo(v) !== null, 'Numéro invalide.'),
});
type FormValues = z.infer<typeof schema>;

async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success('Lien copié.');
  } catch {
    toast.error('Copie impossible, sélectionnez le texte manuellement.');
  }
}

/**
 * Apport d'un bien : n'engendre aucun `Referral` tant que le bailleur n'a pas
 * confirmé par OTP (`referrals_otp_chk`). Le partenaire reçoit un
 * `registrationId` (champ hors contrat documenté dans types.ts) qui sert à
 * construire le lien de confirmation à transmettre au bailleur — aucune
 * route ne livre elle-même ce lien.
 */
export function RegisterPropertyDialog() {
  const [open, setOpen] = React.useState(false);
  const [accepted, setAccepted] = React.useState<ReferralPropertyRegistrationAccepted | null>(null);
  const registerProperty = useRegisterReferralProperty();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      propertyName: '',
      propertyCity: '',
      propertyAddressLine: '',
      landlordLocalPhone: '',
    },
  });

  async function onSubmit(values: FormValues) {
    const landlordPhone = toE164Congo(values.landlordLocalPhone);
    if (!landlordPhone) return;
    try {
      const result = await registerProperty.mutateAsync({
        landlordPhone,
        propertyName: values.propertyName,
        propertyAddressLine: values.propertyAddressLine,
        propertyCity: values.propertyCity,
      });
      setAccepted(result);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  function reset() {
    setOpen(false);
    setAccepted(null);
    form.reset();
  }

  const confirmLink =
    accepted && typeof window !== 'undefined'
      ? `${window.location.origin}/partenaire/confirmer/${accepted.registrationId}`
      : null;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : reset())}>
      <DialogTrigger asChild>
        <Button type="button">
          <PlusCircle className="mr-2 size-4" aria-hidden="true" />
          Apporter un bien
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apporter un bien</DialogTitle>
          <DialogDescription>
            Le bailleur recevra un code à usage unique pour confirmer lui-même le rattachement.
          </DialogDescription>
        </DialogHeader>

        {!accepted ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="propertyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="property-name">Nom du bien</FormLabel>
                    <FormControl>
                      <Input id="property-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="propertyCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="property-city">Ville</FormLabel>
                    <FormControl>
                      <Input id="property-city" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="propertyAddressLine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="property-address">Adresse</FormLabel>
                    <FormControl>
                      <Input id="property-address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="landlordLocalPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="landlord-phone">Téléphone du bailleur</FormLabel>
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
              <DialogFooter>
                <Button type="submit" disabled={registerProperty.isPending}>
                  {registerProperty.isPending ? 'Envoi…' : 'Envoyer le code de confirmation'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Code envoyé à {accepted.confirmationSentTo}. Transmettez ce lien au bailleur pour
              qu&apos;il confirme :
            </p>
            {confirmLink ? (
              <div className="flex items-center gap-2">
                <Input readOnly value={confirmLink} className="text-sm" />
                <Button type="button" variant="outline" onClick={() => copy(confirmLink)}>
                  <Copy className="mr-2 size-4" aria-hidden="true" />
                  Copier
                </Button>
              </div>
            ) : null}
            <Button asChild variant="secondary">
              <a
                href={`https://wa.me/${digitsOnly(accepted.confirmationSentTo)}?text=${encodeURIComponent(
                  `Confirmez votre parrainage Immodesk ici : ${confirmLink ?? ''}`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Partager par WhatsApp
              </a>
            </Button>
            <DialogFooter>
              <Button type="button" onClick={reset}>
                Terminer
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
