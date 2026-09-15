import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { BankStatementAdapterInfo } from '@/lib/api/types';

export function useBankStatementAdapters() {
  return useQuery({
    queryKey: ['bank-statement-adapters'],
    queryFn: () => apiFetch<{ items: BankStatementAdapterInfo[] }>('/bank-statement-adapters'),
  });
}
