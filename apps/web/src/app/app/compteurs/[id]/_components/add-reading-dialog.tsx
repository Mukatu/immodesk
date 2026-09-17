'use client';

import * as React from 'react';
import { PlusCircle } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DocumentUploader } from '@/components/business/document-uploader';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { ApiErrorCode } from '@/lib/api/types';
import type { MeterReading, MeterReadingInput, RelatedEntityType } from '@/lib/api/types';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface AddReadingDialogProps {
  photoRelatedEntityType: RelatedEntityType;
  photoRelatedEntityId: string;
  onSubmit: (input: MeterReadingInput) => Promise<MeterReading>;
}

/**
 * Saisie d'un relevé de compteur. La consommation n'est jamais envoyée : elle
 * est calculée par le serveur (arbitrage 1 du contrat). En cas d'index
 * inférieur au précédent (422 `METERS.INDEX_REGRESSION`), un choix explicite
 * est proposé plutôt qu'un simple message d'erreur : corriger la saisie, ou
 * confirmer un passage par zéro (`rolloverApplied: true`).
 */
export function AddReadingDialog({
  photoRelatedEntityType,
  photoRelatedEntityId,
  onSubmit,
}: AddReadingDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<'form' | 'regression'>('form');
  const [readingDate, setReadingDate] = React.useState(today());
  const [indexValue, setIndexValue] = React.useState('');
  const [isEstimated, setIsEstimated] = React.useState(false);
  const [notes, setNotes] = React.useState('');
  const [photoDocumentId, setPhotoDocumentId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function reset() {
    setStep('form');
    setReadingDate(today());
    setIndexValue('');
    setIsEstimated(false);
    setNotes('');
    setPhotoDocumentId(null);
    setError(null);
  }

  async function attemptSubmit(rolloverApplied?: boolean) {
    setError(null);
    const index = Number(indexValue);
    if (!readingDate || !indexValue || !Number.isFinite(index)) {
      setError('Date et index sont requis.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        readingDate,
        currentIndex: index,
        isEstimated: isEstimated || undefined,
        notes: notes.trim() || undefined,
        photoDocumentId: photoDocumentId ?? undefined,
        rolloverApplied,
        clientRef: crypto.randomUUID(),
      });
      toast.success('Relevé enregistré.');
      setOpen(false);
      reset();
    } catch (err) {
      if (err instanceof ApiError && err.code === ApiErrorCode.METERS_INDEX_REGRESSION) {
        setStep('regression');
      } else if (
        err instanceof ApiError &&
        err.code === ApiErrorCode.METERS_READING_DUPLICATE_DATE
      ) {
        setError('Un relevé existe déjà à cette date pour ce compteur.');
      } else {
        setError(err instanceof ApiError ? err.message : genericErrorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button">
          <PlusCircle className="mr-2 size-4" aria-hidden="true" />
          Saisir un relevé
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Saisir un relevé</DialogTitle>
        </DialogHeader>

        {step === 'regression' ? (
          <div className="space-y-4">
            <p role="alert" className="text-sm text-foreground">
              L&apos;index saisi ({indexValue}) est inférieur au précédent. S&apos;agit-il d&apos;un
              passage par zéro du compteur, ou d&apos;une erreur de saisie ?
            </p>
            {error ? (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('form')}
                disabled={isSubmitting}
              >
                Corriger la saisie
              </Button>
              <Button type="button" onClick={() => attemptSubmit(true)} disabled={isSubmitting}>
                {isSubmitting ? 'Confirmation…' : 'Confirmer le passage par zéro'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reading-date">Date du relevé</Label>
                <Input
                  id="reading-date"
                  type="date"
                  value={readingDate}
                  onChange={(e) => setReadingDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reading-index">Index relevé</Label>
                <Input
                  id="reading-index"
                  type="number"
                  min={0}
                  value={indexValue}
                  onChange={(e) => setIndexValue(e.target.value)}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isEstimated} onChange={(e) => setIsEstimated(e.target.checked)} />
              <span>
                Relevé estimé
                <br />
                <span className="text-xs text-muted-foreground">
                  Non exploitable pour la refacturation tant qu&apos;un gestionnaire ne l&apos;a pas
                  confirmé.
                </span>
              </span>
            </label>

            <div className="space-y-2">
              <Label htmlFor="reading-notes">Notes (facultatif)</Label>
              <Textarea
                id="reading-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Photo du cadran (facultatif)</Label>
              {photoDocumentId ? (
                <p className="text-sm text-success">Photo ajoutée.</p>
              ) : (
                <DocumentUploader
                  relatedEntityType={photoRelatedEntityType}
                  relatedEntityId={photoRelatedEntityId}
                  kind="OTHER"
                  onUploaded={(doc) => setPhotoDocumentId(doc.id)}
                />
              )}
            </div>

            {error ? (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" onClick={() => attemptSubmit()} disabled={isSubmitting}>
                {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
