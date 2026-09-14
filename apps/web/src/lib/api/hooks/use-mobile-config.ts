import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { MobileConfig } from '@/lib/api/types';

/** Paramètres appliqués par l'application mobile sans recompilation (contrat). */
export function useMobileConfig() {
  return useQuery({
    queryKey: ['mobile-config'],
    queryFn: () => apiFetch<MobileConfig>('/mobile/config'),
  });
}
