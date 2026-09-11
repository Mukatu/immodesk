import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { MessageLog, MessageStatus, NotificationChannel, Paginated } from '@/lib/api/types';

export interface UseMessageLogsParams {
  channel?: NotificationChannel;
  status?: MessageStatus;
  relatedEntityType?: string;
  relatedEntityId?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function useMessageLogs(params: UseMessageLogsParams = {}) {
  return useQuery({
    queryKey: ['message-logs', params],
    queryFn: () =>
      apiFetch<Paginated<MessageLog>>(
        `/message-logs${buildQuery({
          channel: params.channel,
          status: params.status,
          relatedEntityType: params.relatedEntityType,
          relatedEntityId: params.relatedEntityId,
          from: params.from,
          to: params.to,
          cursor: params.cursor,
          limit: params.limit,
        })}`,
      ),
  });
}

export function useRetryMessageLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ notificationId: string }>(`/message-logs/${id}/retry`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-logs'] });
    },
  });
}
