'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSignInspection } from '@/lib/api/hooks/use-inspections';
import { inspectionErrorMessage } from './inspection-error-message';

export interface SignInspectionDialogProps {
  inspectionId: string;
}

/**
 * Verrouillage de l'état des lieux. Les signatures manuscrites sont des
 * images téléversées via le module documents (`tenantSignatureDocumentId`/
 * `agentSignatureDocumentId`), recueillies sur le terrain depuis l'application
 * mobile — le dashboard n'a aucun composant de capture de signature et
 * n'envoie donc aucun des deux identifiants. Cette action sert à verrouiller
 * le constat sans signature manuscrite, notamment pour clore le cas d'un
 * locataire absent au-delà du délai de grâce de quinze jours.
 */
export function SignInspectionDialog({ inspectionId }: SignInspectionDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [tenantPresent, setTenantPresent] = React.useState(true);
  const [absenceReason, setAbsenceReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const signInspection = useSignInspection(inspectionId);

  async function handleConfirm() {
    if (!tenantPresent && !absenceReason.trim()) {
      setError("Le motif de l'absence du locataire est requis.");
      return;
    }
    setError(null);
    try {
      await signInspection.mutateAsync({
        tenantPresent,
        absenceReason: tenantPresent ? undefined : absenceReason.trim(),
      });
      toast.success('État des lieux signé.');
      setOpen(false);
    } catch (err) {
      setError(inspectionErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">Signer</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Signer l&apos;état des lieux</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Les signatures manuscrites du locataire et de l&apos;agence se recueillent sur le
            terrain depuis l&apos;application mobile. Cette action verrouille le constat sans
            signature manuscrite, notamment pour clore le cas d&apos;un locataire absent au-delà du
            délai de grâce de quinze jours.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={tenantPresent}
              onChange={(e) => setTenantPresent(e.target.checked)}
            />
            Le locataire est présent
          </label>
          {!tenantPresent ? (
            <div className="space-y-2">
              <Label htmlFor="signAbsenceReason">Motif de l&apos;absence</Label>
              <Textarea
                id="signAbsenceReason"
                value={absenceReason}
                onChange={(e) => setAbsenceReason(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Le statut passera à « En attente de signature » : un manager pourra clore au-delà de
                quinze jours si le locataire ne signe pas.
              </p>
            </div>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={handleConfirm} disabled={signInspection.isPending}>
            {signInspection.isPending ? 'Signature…' : 'Confirmer la signature'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
