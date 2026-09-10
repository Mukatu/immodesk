import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { ContactChannel, ContactChannelInput } from '@/lib/api/types';

export type ContactChannelOwnerType = 'landlords' | 'tenants' | 'guarantors';

export function useContactChannels(ownerType: ContactChannelOwnerType, ownerId: string | null) {
  return useQuery({
    queryKey: ['contact-channels', ownerType, ownerId],
    queryFn: () =>
      apiFetch<{ items: ContactChannel[] }>(`/parties/${ownerType}/${ownerId}/contact-channels`),
    enabled: Boolean(ownerId),
  });
}

export function useCreateContactChannel(ownerType: ContactChannelOwnerType, ownerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ContactChannelInput) =>
      apiFetch<ContactChannel>(`/parties/${ownerType}/${ownerId}/contact-channels`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-channels', ownerType, ownerId] });
    },
  });
}

export function useUpdateContactChannel(ownerType: ContactChannelOwnerType, ownerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { label?: string; isPrimary?: boolean; optIn?: boolean };
    }) => apiFetch<ContactChannel>(`/contact-channels/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-channels', ownerType, ownerId] });
    },
  });
}

export function useDeleteContactChannel(ownerType: ContactChannelOwnerType, ownerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/contact-channels/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-channels', ownerType, ownerId] });
    },
  });
}
