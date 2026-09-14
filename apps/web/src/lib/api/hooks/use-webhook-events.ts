import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { Paginated, WebhookEvent, WebhookSource, WebhookStatus } from '@/lib/api/types';

export interface UseWebhookEventsParams {
  source?: WebhookSource;
  status?: WebhookStatus;
  signatureValid?: boolean;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function useWebhookEvents(params: UseWebhookEventsParams = {}) {
  return useQuery({
    queryKey: ['webhook-events', params],
    queryFn: () =>
      apiFetch<Paginated<WebhookEvent>>(
        `/webhook-events${buildQuery({
          source: params.source,
          status: params.status,
          signatureValid: params.signatureValid,
          from: params.from,
          to: params.to,
          limit: params.limit,
          cursor: params.cursor,
        })}`,
      ),
  });
}

export function useReplayWebhookEvent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<void>(`/webhook-events/${id}/replay`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-events'] });
    },
  });
}
