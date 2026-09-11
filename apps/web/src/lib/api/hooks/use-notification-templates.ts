import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { NotificationTemplate, UpdateNotificationTemplateBody } from '@/lib/api/types';

export function useNotificationTemplates() {
  return useQuery({
    queryKey: ['notification-templates'],
    queryFn: () => apiFetch<{ items: NotificationTemplate[] }>('/notification-templates'),
  });
}

export function useUpdateNotificationTemplate(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateNotificationTemplateBody) =>
      apiFetch<NotificationTemplate>(`/notification-templates/${id}`, {
        method: 'PATCH',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
    },
  });
}

export function useTestNotificationTemplate(id: string) {
  return useMutation({
    mutationFn: (body: { phone: string }) =>
      apiFetch<{ notificationId: string }>(`/notification-templates/${id}/test`, {
        method: 'POST',
        body,
      }),
  });
}
