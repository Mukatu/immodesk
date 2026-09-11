'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/business/phone-input';
import { useTestNotificationTemplate } from '@/lib/api/hooks/use-notification-templates';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { toE164Congo } from '@/lib/phone';

export interface TestTemplateDialogProps {
  templateId: string;
}

/** Dialog d'envoi d'un message de test pour un gabarit, à un numéro donné. */
export function TestTemplateDialog({ templateId }: TestTemplateDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [localPhone, setLocalPhone] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const testTemplate = useTestNotificationTemplate(templateId);

  async function handleSend() {
    const phone = toE164Congo(localPhone);
    if (!phone) {
      setError('Numéro invalide.');
      return;
    }
    setError(null);
    try {
      await testTemplate.mutateAsync({ phone });
      toast.success('Message de test envoyé.');
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Tester
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Envoyer un message de test</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="testPhone">Numéro de téléphone</Label>
          <PhoneInput id="testPhone" value={localPhone} onValueChange={setLocalPhone} />
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={handleSend} disabled={testTemplate.isPending}>
            {testTemplate.isPending ? 'Envoi…' : 'Envoyer le test'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
