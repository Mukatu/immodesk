'use client';

import { Badge } from '@/components/ui/badge';
import type { InspectionItem } from '@/lib/api/types';
import { DepositDeductionDialog } from './deposit-deduction-dialog';
import { ConvertToMaintenanceDialog } from './convert-to-maintenance-dialog';

export interface ItemDamageActionsProps {
  inspectionId: string;
  item: InspectionItem;
}

/**
 * Actions propres à un poste dégradé : retenue sur dépôt et conversion en
 * maintenance sont exclusives l'une de l'autre (arbitrage 5) — dès que l'une
 * des deux a été faite, l'autre n'est plus proposée du tout.
 */
export function ItemDamageActions({ inspectionId, item }: ItemDamageActionsProps) {
  if (!item.isDamaged) return null;

  if (item.hasDepositDeduction) {
    return <Badge variant="destructive">Retenue appliquée au dépôt</Badge>;
  }
  if (item.hasMaintenanceRequest) {
    return <Badge variant="secondary">Converti en demande de maintenance</Badge>;
  }
  return (
    <>
      <DepositDeductionDialog inspectionId={inspectionId} item={item} />
      <ConvertToMaintenanceDialog inspectionId={inspectionId} item={item} />
    </>
  );
}
