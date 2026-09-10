'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

import { Button } from '@/components/ui/button';
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
import { ApiError } from '@/lib/api/client';
import { toE164Congo, formatE164Congo } from '@/lib/phone';
import { useAuth } from '@/lib/auth/auth-context';

const phoneSchema = z.object({
  localPhone: z.string().refine((v) => toE164Congo(v) !== null, {
    message: 'Numéro invalide. Exemple : 06 600 00 01.',
  }),
});

const codeSchema = z.object({
  code: z.string().length(6, 'Le code contient 6 chiffres.'),
});

type Step = { name: 'phone' } | { name: 'code'; phone: string; resendAfterSeconds: number };

function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'IAM.OTP_INVALID':
        return 'Code incorrect. Vérifiez le code reçu par SMS et réessayez.';
      case 'IAM.OTP_LOCKED':
        return 'Trop de tentatives incorrectes. Demandez un nouveau code.';
      case 'IAM.RATE_LIMITED':
        return 'Trop de demandes. Merci de réessayer dans quelques minutes.';
      default:
        return error.message || 'Une erreur est survenue.';
    }
  }
  return 'Une erreur est survenue. Vérifiez votre connexion et réessayez.';
}

export default function LoginPage() {
  const router = useRouter();
  const { requestOtp, verifyOtp, organizations } = useAuth();
  const [step, setStep] = React.useState<Step>({ name: 'phone' });
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [secondsLeft, setSecondsLeft] = React.useState(0);

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { localPhone: '' },
  });

  const codeForm = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  React.useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  async function onSubmitPhone(values: z.infer<typeof phoneSchema>) {
    setServerError(null);
    const phone = toE164Congo(values.localPhone);
    if (!phone) return;
    setSubmitting(true);
    try {
      const result = await requestOtp({ phone, channel: 'SMS' });
      setStep({ name: 'code', phone, resendAfterSeconds: result.resendAfterSeconds });
      setSecondsLeft(result.resendAfterSeconds);
      codeForm.reset({ code: '' });
    } catch (error) {
      setServerError(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitCode(values: z.infer<typeof codeSchema>) {
    if (step.name !== 'code') return;
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await verifyOtp(step.phone, values.code);
      if (result.organizations.length === 0) {
        router.push('/onboarding/organisation');
      } else {
        router.push('/app');
      }
    } catch (error) {
      setServerError(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (step.name !== 'code' || secondsLeft > 0) return;
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await requestOtp({ phone: step.phone, channel: 'SMS' });
      setStep({ ...step, resendAfterSeconds: result.resendAfterSeconds });
      setSecondsLeft(result.resendAfterSeconds);
    } catch (error) {
      setServerError(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  React.useEffect(() => {
    if (organizations.length && step.name === 'phone') {
      // déjà connecté
      router.replace('/app');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main
      id="contenu-principal"
      className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12"
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Connexion à Immodesk</CardTitle>
          <CardDescription>
            {step.name === 'phone'
              ? 'Saisissez votre numéro de téléphone pour recevoir un code par SMS.'
              : `Code envoyé au ${formatE164Congo(step.phone)}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step.name === 'phone' ? (
            <Form {...phoneForm}>
              <form
                onSubmit={phoneForm.handleSubmit(onSubmitPhone)}
                className="space-y-4"
                noValidate
              >
                <FormField
                  control={phoneForm.control}
                  name="localPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="phone-input">Numéro de téléphone</FormLabel>
                      <FormControl>
                        <PhoneInput
                          id="phone-input"
                          value={field.value}
                          onValueChange={field.onChange}
                          aria-required="true"
                        />
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
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Envoi en cours…' : 'Recevoir le code'}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...codeForm}>
              <form onSubmit={codeForm.handleSubmit(onSubmitCode)} className="space-y-4" noValidate>
                <FormField
                  control={codeForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="otp-input">Code à 6 chiffres</FormLabel>
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
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Vérification…' : 'Valider le code'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  disabled={secondsLeft > 0 || submitting}
                  onClick={handleResend}
                >
                  {secondsLeft > 0 ? `Renvoyer le code (${secondsLeft}s)` : 'Renvoyer le code'}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full"
                  onClick={() => setStep({ name: 'phone' })}
                >
                  Changer de numéro
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
