'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useApproveExpense } from '@/lib/api/hooks/use-expenses';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export function ApproveExpenseButton({ expenseId }: { expenseId: string }) {
  const approveExpense = useApproveExpense(expenseId);

  async function handleApprove() {
    try {
      await approveExpense.mutateAsync();
      toast.success('Dépense validée.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Button type="button" size="sm" onClick={handleApprove} disabled={approveExpense.isPending}>
      {approveExpense.isPending ? 'Validation…' : 'Valider'}
    </Button>
  );
}
