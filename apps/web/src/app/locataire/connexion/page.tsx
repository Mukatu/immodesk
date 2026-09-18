'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/business/phone-input';
import { useTenantAuth } from '@/lib/auth/tenant-auth-context';
import { ApiError } from '@/lib/api/tenant-client';
import { toE164Congo } from '@/lib/phone';
import { writeTenantPortalSessionFlag } from '@/app/locataire/_lib/tenant-portal-cookie';

type Step = { name: 'phone' } | { name: 'code'; phone: string };

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'IAM.OTP_INVALID')
      return 'Code incorrect. Vérifiez le code reçu par téléphone.';
    if (error.code === 'TENANT_PORTAL.PHONE_NOT_FOUND') {
      return 'Aucun locataire connu pour ce numéro. Contactez votre gestionnaire.';
    }
    return error.message || 'Une erreur est survenue.';
  }
  return 'Une erreur est survenue. Vérifiez votre connexion et réessayez.';
}

/** Connexion du portail locataire : OTP direct sur le téléphone, sans jeton d'invitation. */
export default function ConnexionLocatairePage() {
  const router = useRouter();
  const { requestOtp, verifyOtp } = useTenantAuth();
  const [step, setStep] = React.useState<Step>({ name: 'phone' });
  const [localPhone, setLocalPhone] = React.useState('');
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleRequest() {
    const phone = toE164Congo(localPhone);
    if (!phone) {
      setError('Numéro de téléphone incomplet.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await requestOtp(phone);
      setStep({ name: 'code', phone });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify() {
    if (step.name !== 'code') return;
    setError(null);
    setSubmitting(true);
    try {
      await verifyOtp(step.phone, code);
      // Posé avant la navigation : un `useEffect` (tenant-session-flag.tsx)
      // arriverait trop tard, après que router.push ait déjà traversé le
      // middleware (voir tenant-portal-cookie.ts).
      writeTenantPortalSessionFlag();
      router.push('/locataire');
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
          <CardTitle>Portail locataire</CardTitle>
          <CardDescription>
            {step.name === 'phone'
              ? 'Recevez un code par téléphone pour accéder à vos factures et quittances.'
              : `Code envoyé au ${step.phone}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step.name === 'phone' ? (
            <div className="space-y-2">
              <Label htmlFor="tenant-phone-input">Numéro de téléphone</Label>
              <PhoneInput
                id="tenant-phone-input"
                value={localPhone}
                onValueChange={setLocalPhone}
              />
              <Button
                type="button"
                className="w-full"
                onClick={handleRequest}
                disabled={submitting}
              >
                {submitting ? 'Envoi en cours…' : 'Recevoir le code'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <label htmlFor="tenant-otp-input" className="sr-only">
                Code à 6 chiffres
              </label>
              <InputOTP id="tenant-otp-input" maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <Button type="button" className="w-full" onClick={handleVerify} disabled={submitting}>
                {submitting ? 'Vérification…' : 'Se connecter'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep({ name: 'phone' });
                  setCode('');
                  setError(null);
                }}
              >
                Changer de numéro
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
