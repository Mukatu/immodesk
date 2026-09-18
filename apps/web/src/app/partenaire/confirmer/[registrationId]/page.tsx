'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { BadgeCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ApiError } from '@/lib/api/client';
import { useConfirmReferralPropertyOtp } from '@/lib/api/hooks/use-referral';
import type { Referral } from '@/lib/api/types';

const schema = z.object({ code: z.string().length(6, 'Le code compte 6 chiffres.') });
type FormValues = z.infer<typeof schema>;

/**
 * Page publique de confirmation d'un apport de bien par le bailleur (rôle
 * « Public bailleur » du contrat) : aucune session Immodesk requise, atteinte
 * via le lien transmis par le partenaire (WhatsApp/SMS). Sur le modèle de
 * /verifier/[token] et /portail/activer/[token].
 */
export default function ConfirmerApportPage() {
  const params = useParams<{ registrationId: string }>();
  const registrationId = params.registrationId;
  const confirm = useConfirmReferralPropertyOtp(registrationId);
  const [result, setResult] = React.useState<Referral | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { code: '' } });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const referral = await confirm.mutateAsync({ code: values.code });
      setResult(referral);
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : 'Confirmation impossible pour le moment.',
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Confirmer le rattachement de votre bien</CardTitle>
          <CardDescription>
            Un partenaire Immodesk a signalé votre bien. Saisissez le code reçu par SMS ou WhatsApp
            pour confirmer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <BadgeCheck className="size-10 text-success" aria-hidden="true" />
              <p className="font-medium">
                Rattachement confirmé pour {result.referredOrganizationName}.
              </p>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="otp-input">Code de confirmation</FormLabel>
                      <FormControl>
                        <InputOTP
                          id="otp-input"
                          maxLength={6}
                          value={field.value}
                          onChange={field.onChange}
                        >
                          <InputOTPGroup>
                            {Array.from({ length: 6 }).map((_, i) => (
                              <InputOTPSlot key={i} index={i} />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {serverError ? (
                  <p
                    role="alert"
                    aria-live="polite"
                    className="text-sm font-medium text-destructive"
                  >
                    {serverError}
                  </p>
                ) : null}
                <Button type="submit" className="w-full" disabled={confirm.isPending}>
                  {confirm.isPending ? 'Vérification…' : 'Confirmer'}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
