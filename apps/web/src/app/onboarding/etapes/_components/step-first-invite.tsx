'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/business/phone-input';
import { EnumSelect } from '@/components/business/enum-select';
import { useOnboardingInvite } from '@/lib/api/hooks/use-onboarding-wizard';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { toE164Congo } from '@/lib/phone';
import type { Role } from '@/lib/api/types';

export interface StepFirstInviteProps {
  organizationId: string;
  onDone: () => void;
  onSkip: () => void;
}

/**
 * Libellés du rôle propres à cette étape (pas de `ROLE_LABELS` global dans
 * `enum-labels.ts`) : OWNER exclu, ce rôle n'est jamais distribué par
 * invitation.
 */
const INVITE_ROLE_LABELS: Record<Exclude<Role, 'OWNER'>, string> = {
  MANAGER: 'Gestionnaire',
  COLLECTOR: 'Démarcheur',
  ACCOUNTANT: 'Comptable',
  VIEWER: 'Lecture seule',
};

/** Étape « première invitation » : mêmes champs qu'une invitation de membre (phase 0). */
export function StepFirstInvite({ organizationId, onDone, onSkip }: StepFirstInviteProps) {
  const invite = useOnboardingInvite(organizationId);
  const [phoneLocal, setPhoneLocal] = React.useState('');
  const [role, setRole] = React.useState<Exclude<Role, 'OWNER'> | ''>('');
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const phone = toE164Congo(phoneLocal);
    if (!phone || !role) {
      setError('Numéro et rôle sont requis.');
      return;
    }
    setError(null);
    try {
      await invite.mutateAsync({ phone, role });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="first-invite-phone">Téléphone de la personne invitée</Label>
        <PhoneInput id="first-invite-phone" value={phoneLocal} onValueChange={setPhoneLocal} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="first-invite-role">Rôle</Label>
        <EnumSelect
          id="first-invite-role"
          value={role}
          onValueChange={setRole}
          labels={INVITE_ROLE_LABELS}
          placeholder="Sélectionnez un rôle"
        />
      </div>

      {error ? (
        <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={onSkip}>
          Passer cette étape
        </Button>
        <Button type="submit" disabled={invite.isPending}>
          {invite.isPending ? 'Envoi…' : "Envoyer l'invitation"}
        </Button>
      </div>
    </form>
  );
}
