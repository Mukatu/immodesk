'use client';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useActivateDunningRule } from '@/lib/api/hooks/use-dunning-rules';
import type { DunningRule } from '@/lib/api/types';

export interface StepActivateButtonProps {
  rule: DunningRule;
}

/** Un palier ne se supprime jamais (arbitrage 3 du contrat) : il se désactive puis se réactive. */
export function StepActivateButton({ rule }: StepActivateButtonProps) {
  const activate = useActivateDunningRule(rule.id);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={activate.isPending}
      onClick={async () => {
        try {
          await activate.mutateAsync(!rule.isActive);
          toast.success(rule.isActive ? 'Palier désactivé.' : 'Palier réactivé.');
        } catch {
          toast.error('Impossible de modifier ce palier.');
        }
      }}
    >
      {rule.isActive ? 'Désactiver' : 'Réactiver'}
    </Button>
  );
}
