'use client';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useApproveOwnerPayout } from '@/lib/api/hooks/use-owner-payouts';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export function ApprovePayoutButton({ payoutId }: { payoutId: string }) {
  const approvePayout = useApproveOwnerPayout(payoutId);

  async function handleApprove() {
    try {
      await approvePayout.mutateAsync();
      toast.success('Reversement approuvé.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Button type="button" size="sm" onClick={handleApprove} disabled={approvePayout.isPending}>
      {approvePayout.isPending ? 'Approbation…' : 'Approuver'}
    </Button>
  );
}
