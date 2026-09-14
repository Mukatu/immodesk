import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { DeviceStatus } from '@/lib/api/types';

/**
 * Supervision par démarcheur/appareil (contrat : « quel démarcheur n'a pas
 * synchronisé depuis longtemps »).
 */
export function useSyncDevices() {
  return useQuery({
    queryKey: ['sync-devices'],
    queryFn: () => apiFetch<{ items: DeviceStatus[] }>('/sync/devices'),
  });
}
