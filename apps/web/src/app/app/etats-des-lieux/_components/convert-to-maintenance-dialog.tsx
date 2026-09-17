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
import { EnumSelect } from '@/components/business/enum-select';
import { MoneyInput } from '@/components/business/money-input';
import { useConvertInspectionItemToMaintenance } from '@/lib/api/hooks/use-inspections';
import { EXPENSE_BEARER_LABELS, MAINTENANCE_PRIORITY_LABELS } from '@/lib/enum-labels';
import type { ExpenseBearer, InspectionItem, MaintenancePriority } from '@/lib/api/types';
import { inspectionErrorMessage } from './inspection-error-message';

export interface ConvertToMaintenanceDialogProps {
  inspectionId: string;
  item: InspectionItem;
  onConverted?: () => void;
}

/**
 * Conversion d'un poste dégradé en demande de maintenance (`reporterType: INSPECTION`).
 * Exclusive de la retenue sur dépôt pour le même poste (arbitrage 5).
 */
export function ConvertToMaintenanceDialog({
  inspectionId,
  item,
  onConverted,
}: ConvertToMaintenanceDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [priority, setPriority] = React.useState<MaintenancePriority | ''>('NORMAL');
  const [estimatedAmount, setEstimatedAmount] = React.useState<number | null>(
    item.repairAmount ?? null,
  );
  const [chargedTo, setChargedTo] = React.useState<ExpenseBearer | ''>(item.chargedTo ?? '');
  const [error, setError] = React.useState<string | null>(null);
  const convert = useConvertInspectionItemToMaintenance(inspectionId, item.id);

  async function handleConfirm() {
    setError(null);
    try {
      const created = await convert.mutateAsync({
        priority: priority || undefined,
        estimatedAmount: estimatedAmount ?? undefined,
        chargedTo: chargedTo || undefined,
      });
      toast.success(`Demande de maintenance créée (${created.reference}).`);
      setOpen(false);
      onConverted?.();
    } catch (err) {
      setError(inspectionErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Convertir en maintenance
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Convertir en maintenance — {item.roomLabel} / {item.elementLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Une seule conversion est possible pour ce poste, et elle est exclusive d&apos;une
            retenue sur le dépôt de garantie.
          </p>
          <div className="space-y-2">
            <Label htmlFor={`priority-${item.id}`}>Priorité</Label>
            <EnumSelect
              id={`priority-${item.id}`}
              value={priority}
              onValueChange={setPriority}
              labels={MAINTENANCE_PRIORITY_LABELS}
              placeholder="Priorité"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`estimated-${item.id}`}>Montant estimé</Label>
            <MoneyInput
              id={`estimated-${item.id}`}
              value={estimatedAmount}
              onValueChange={setEstimatedAmount}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`charged-to-${item.id}`}>Partie qui supporte le coût</Label>
            <EnumSelect
              id={`charged-to-${item.id}`}
              value={chargedTo}
              onValueChange={setChargedTo}
              labels={EXPENSE_BEARER_LABELS}
              placeholder="Partie qui supporte le coût"
            />
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={handleConfirm} disabled={convert.isPending}>
            {convert.isPending ? 'Conversion…' : 'Confirmer la conversion'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
