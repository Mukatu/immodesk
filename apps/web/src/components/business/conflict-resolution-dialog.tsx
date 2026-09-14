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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export type ConflictResolutionDecision = 'APPLY' | 'DISCARD';

export interface ConflictResolutionDialogProps {
  /** Libellé de la facture visée par l'opération d'origine, pour référence dans le formulaire. */
  originalInvoiceLabel: string;
  /** Factures ouvertes vers lesquelles rediriger l'opération. */
  invoiceOptions: { id: string; label: string }[];
  onApply: (input: { invoiceId?: string; autoAllocate: boolean }) => Promise<unknown>;
  onDiscard: (input: { reason: string }) => Promise<unknown>;
  onResolved?: () => void;
}

const KEEP_ORIGINAL_VALUE = '__keep_original__';

/**
 * Résolution d'un conflit de synchronisation en deux choix (contrat,
 * `POST /v1/sync/conflicts/{id}/resolve`) : appliquer, avec correction
 * facultative de la facture visée et de l'imputation automatique, ou
 * abandonner avec motif obligatoire. Dans les deux cas, le `clientRef`
 * d'origine est conservé côté API : aucun doublon n'est jamais créé.
 */
export function ConflictResolutionDialog({
  originalInvoiceLabel,
  invoiceOptions,
  onApply,
  onDiscard,
  onResolved,
}: ConflictResolutionDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [decision, setDecision] = React.useState<ConflictResolutionDecision>('APPLY');
  const [invoiceId, setInvoiceId] = React.useState<string>(KEEP_ORIGINAL_VALUE);
  const [autoAllocate, setAutoAllocate] = React.useState(true);
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setDecision('APPLY');
      setInvoiceId(KEEP_ORIGINAL_VALUE);
      setAutoAllocate(true);
      setReason('');
      setError(null);
    }
  }, [open]);

  const discardBlocked = decision === 'DISCARD' && !reason.trim();
  const submitDisabled = isSubmitting || discardBlocked;

  async function handleConfirm() {
    setError(null);
    if (decision === 'DISCARD' && !reason.trim()) {
      setError("Le motif est obligatoire pour abandonner l'opération.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (decision === 'APPLY') {
        await onApply({
          invoiceId: invoiceId === KEEP_ORIGINAL_VALUE ? undefined : invoiceId,
          autoAllocate,
        });
        toast.success(
          "Conflit résolu : l'identifiant d'origine est conservé, aucun doublon n'a été créé.",
        );
      } else {
        await onDiscard({ reason: reason.trim() });
        toast.success(
          "Opération abandonnée : l'identifiant d'origine est conservé, aucun doublon ne sera créé.",
        );
      }
      setOpen(false);
      onResolved?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">Résoudre ce conflit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Résoudre ce conflit</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          L&apos;identifiant d&apos;origine de l&apos;opération est conservé quelle que soit votre
          décision : aucun doublon ne sera créé, même si l&apos;appareil retente l&apos;envoi.
        </p>

        <fieldset className="space-y-2" role="radiogroup" aria-label="Décision">
          <legend className="sr-only">Décision</legend>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="radio"
              name="conflict-decision"
              value="APPLY"
              checked={decision === 'APPLY'}
              onChange={() => setDecision('APPLY')}
              className="accent-primary"
            />
            Appliquer l&apos;opération
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="radio"
              name="conflict-decision"
              value="DISCARD"
              checked={decision === 'DISCARD'}
              onChange={() => setDecision('DISCARD')}
              className="accent-primary"
            />
            Abandonner l&apos;opération
          </label>
        </fieldset>

        {decision === 'APPLY' ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="conflict-invoice">Facture visée</Label>
              <p className="text-xs text-muted-foreground">
                Facture d&apos;origine : {originalInvoiceLabel}
              </p>
              <Select value={invoiceId} onValueChange={setInvoiceId}>
                <SelectTrigger id="conflict-invoice">
                  <SelectValue placeholder="Conserver la facture d'origine" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={KEEP_ORIGINAL_VALUE}>
                    Conserver la facture d&apos;origine
                  </SelectItem>
                  {invoiceOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={autoAllocate}
                onChange={(e) => setAutoAllocate(e.target.checked)}
              />
              Imputation automatique sur la facture retenue
            </label>
          </div>
        ) : (
          <div className="space-y-1">
            <Label htmlFor="conflict-discard-reason">
              Motif <span aria-hidden="true">*</span>
              <span className="sr-only">(obligatoire)</span>
            </Label>
            <Textarea
              id="conflict-discard-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-required="true"
              aria-invalid={discardBlocked ? true : undefined}
            />
          </div>
        )}

        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant={decision === 'DISCARD' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={submitDisabled}
          >
            {isSubmitting
              ? 'Résolution…'
              : decision === 'APPLY'
                ? "Confirmer l'application"
                : "Confirmer l'abandon"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
