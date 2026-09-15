'use client';

import * as React from 'react';
import { MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useInviteMandateLandlord } from '@/lib/api/hooks/use-mandates';
import { LANDLORD_INVITATION_STATUS_LABELS } from '@/lib/enum-labels';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import type { MandateLandlordPortalInfo } from '@/lib/api/types';

export interface InviteLandlordButtonProps {
  mandateId: string;
  portal: MandateLandlordPortalInfo;
}

/** Invitation du bailleur au portail par WhatsApp, avec le statut courant de l'invitation. */
export function InviteLandlordButton({ mandateId, portal }: InviteLandlordButtonProps) {
  const [error, setError] = React.useState<string | null>(null);
  const inviteLandlord = useInviteMandateLandlord(mandateId);

  const status = portal.activated ? 'ACTIVATED' : portal.invited ? 'INVITED' : 'NOT_INVITED';

  async function handleInvite() {
    setError(null);
    try {
      await inviteLandlord.mutateAsync();
      toast.success('Invitation envoyée par WhatsApp.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={portal.activated ? 'success' : portal.invited ? 'secondary' : 'outline'}>
          {LANDLORD_INVITATION_STATUS_LABELS[status]}
        </Badge>
        {!portal.activated ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleInvite}
            disabled={inviteLandlord.isPending}
          >
            <MessageCircle className="mr-2 size-4" aria-hidden="true" />
            {inviteLandlord.isPending
              ? 'Envoi…'
              : portal.invited
                ? 'Renvoyer l’invitation par WhatsApp'
                : 'Inviter le bailleur par WhatsApp'}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
