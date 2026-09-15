'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { usePortalAuth } from '@/lib/auth/portal-auth-context';
import { ApiError } from '@/lib/api/portal-client';

type Step = { name: 'request' } | { name: 'code'; phoneMasked: string; resendAfterSeconds: number };

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'IAM.OTP_INVALID')
      return 'Code incorrect. Vérifiez le code reçu par téléphone.';
    if (error.code === 'AGENCY.INVITATION_NOT_FOUND') {
      return "Ce lien d'invitation n'est plus valide. Demandez un nouveau lien à votre gestionnaire.";
    }
    return error.message || 'Une erreur est survenue.';
  }
  return 'Une erreur est survenue. Vérifiez votre connexion et réessayez.';
}

export default function ActivationPortailPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { requestActivation, verifyActivation } = usePortalAuth();
  const [step, setStep] = React.useState<Step>({ name: 'request' });
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleRequest() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await requestActivation(params.token);
      setStep({
        name: 'code',
        phoneMasked: result.phoneMasked,
        resendAfterSeconds: result.resendAfterSeconds,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify() {
    setError(null);
    setSubmitting(true);
    try {
      await verifyActivation(params.token, code);
      router.push('/portail');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      id="contenu-principal"
      className="flex min-h-screen items-center justify-center px-4 py-12"
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Activer votre portail bailleur</CardTitle>
          <CardDescription>
            {step.name === 'request'
              ? 'Recevez un code sur le téléphone associé à ce mandat pour activer votre accès en lecture seule.'
              : `Code envoyé au ${step.phoneMasked}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step.name === 'request' ? (
            <Button type="button" className="w-full" onClick={handleRequest} disabled={submitting}>
              {submitting ? 'Envoi en cours…' : 'Recevoir le code'}
            </Button>
          ) : (
            <div className="space-y-4">
              <label htmlFor="portal-otp-input" className="sr-only">
                Code à 6 chiffres
              </label>
              <InputOTP id="portal-otp-input" maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <Button type="button" className="w-full" onClick={handleVerify} disabled={submitting}>
                {submitting ? 'Vérification…' : 'Activer mon accès'}
              </Button>
            </div>
          )}
          {error ? (
            <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
