'use client';

import * as React from 'react';
import { TriangleAlert } from 'lucide-react';
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
import { ComparisonRow } from '@/components/business/comparison-row';
import { MoneyInput } from '@/components/business/money-input';
import { MoneyXaf } from '@/components/business/money-xaf';
import { useCreateDepositDeduction } from '@/lib/api/hooks/use-inspections';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import type { InspectionComparisonRow, InspectionCondition, InspectionItem } from '@/lib/api/types';
import { PhotoLink } from './photo-link';

export interface ComparisonItemRowProps {
  row: InspectionComparisonRow;
  moveOutInspectionId: string;
  /** Poste correspondant dans l'état des lieux de sortie, s'il a pu être apparié par pièce/élément. */
  moveOutItem: InspectionItem | undefined;
}

const FALLBACK_CONDITION: InspectionCondition = 'MISSING';

/** Une ligne de comparaison, avec ses photos, sa retenue proposée et sa validation. */
export function ComparisonItemRow({
  row,
  moveOutInspectionId,
  moveOutItem,
}: ComparisonItemRowProps) {
  const label = `${row.roomLabel} — ${row.elementLabel}`;
  const isDegraded = row.status === 'DEGRADED';
  const [amount, setAmount] = React.useState<number | null>(row.suggestedDeductionAmount || null);
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const createDeduction = useCreateDepositDeduction(moveOutInspectionId, moveOutItem?.id ?? '');

  const alreadyApplied = Boolean(moveOutItem?.hasDepositDeduction);
  const canValidate = isDegraded && Boolean(moveOutItem) && !alreadyApplied;

  async function handleConfirm() {
    if (!moveOutItem || amount === null || amount <= 0) {
      setError('Le montant de la retenue est requis.');
      return;
    }
    setError(null);
    try {
      await createDeduction.mutateAsync({
        amount,
        reason: `${row.roomLabel} — ${row.elementLabel}`,
      });
      toast.success('Retenue appliquée au dépôt de garantie.');
      setOpen(false);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INSPECTIONS.DEDUCTION_ALREADY_APPLIED') {
        setError('Une retenue a déjà été appliquée pour ce poste.');
      } else if (err instanceof ApiError && err.code === 'DEPOSITS.INSUFFICIENT_BALANCE') {
        setError(
          'Solde du dépôt de garantie insuffisant : cette retenue ne peut pas être appliquée telle quelle.',
        );
      } else {
        setError(err instanceof ApiError ? err.message : genericErrorMessage);
      }
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <ComparisonRow
        label={label}
        conditionIn={row.entryCondition ?? FALLBACK_CONDITION}
        conditionOut={row.exitCondition ?? FALLBACK_CONDITION}
        deductionAmount={row.suggestedDeductionAmount}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Photos à l&apos;entrée</p>
          <div className="flex flex-wrap gap-2">
            {row.entryPhotos.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune photo.</p>
            ) : (
              row.entryPhotos.map((documentId) => (
                <PhotoLink key={documentId} documentId={documentId} label={`${label} — entrée`} />
              ))
            )}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Photos à la sortie</p>
          <div className="flex flex-wrap gap-2">
            {row.exitPhotos.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune photo.</p>
            ) : (
              row.exitPhotos.map((documentId) => (
                <PhotoLink key={documentId} documentId={documentId} label={`${label} — sortie`} />
              ))
            )}
          </div>
        </div>
      </div>

      {isDegraded ? (
        <div className="flex flex-wrap items-end gap-3 border-t border-border pt-2">
          <div className="space-y-1">
            <Label htmlFor={`deduction-${row.roomLabel}-${row.elementLabel}`}>
              Retenue proposée
            </Label>
            <MoneyInput
              id={`deduction-${row.roomLabel}-${row.elementLabel}`}
              value={amount}
              onValueChange={setAmount}
              disabled={alreadyApplied}
            />
          </div>
          {alreadyApplied ? (
            <p className="text-sm text-muted-foreground">Retenue déjà appliquée pour ce poste.</p>
          ) : !moveOutItem ? (
            <p className="text-sm text-muted-foreground">
              Poste introuvable dans l&apos;état des lieux de sortie.
            </p>
          ) : (
            <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : setOpen(false))}>
              <DialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm" disabled={!canValidate}>
                  Valider la retenue
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Valider la retenue — {label}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="flex items-start gap-2 rounded-md bg-warning/10 p-3 text-sm text-foreground">
                    <TriangleAlert
                      className="mt-0.5 size-4 shrink-0 text-warning"
                      aria-hidden="true"
                    />
                    <span>
                      Cette retenue sera prélevée sur le dépôt de garantie du bail. Si le solde
                      détenu est insuffisant, le remboursement restitué au locataire sera réduit
                      d&apos;autant, voire refusé par l&apos;API.
                    </span>
                  </p>
                  <p className="text-sm">
                    Montant retenu : <MoneyXaf amount={amount ?? 0} className="font-medium" />
                  </p>
                </div>
                {error ? (
                  <p role="alert" className="text-sm font-medium text-destructive">
                    {error}
                  </p>
                ) : null}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleConfirm}
                    disabled={createDeduction.isPending}
                  >
                    {createDeduction.isPending ? 'Validation…' : 'Confirmer la retenue'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      ) : null}
    </div>
  );
}
