import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { CollectorBalance } from '@/lib/api/types';

export function useCashCollectors() {
  return useQuery({
    queryKey: ['cash-collectors'],
    queryFn: () => apiFetch<{ items: CollectorBalance[] }>('/cash/collectors'),
  });
}

export function useCashCollectorBalance(userId: string | null) {
  return useQuery({
    queryKey: ['cash-collectors', userId, 'balance'],
    queryFn: () => apiFetch<CollectorBalance>(`/cash/collectors/${userId}/balance`),
    enabled: Boolean(userId),
  });
}
