import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { MeterType, UtilityTariff, UtilityTariffInput } from '@/lib/api/types';

export interface UseUtilityTariffsParams {
  propertyId?: string;
  meterType?: MeterType;
  activeOnly?: boolean;
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

export function useUtilityTariffs(params: UseUtilityTariffsParams = {}) {
  return useQuery({
    queryKey: ['utility-tariffs', params],
    queryFn: () =>
      apiFetch<{ items: UtilityTariff[] }>(
        `/utility-tariffs${buildQuery({
          propertyId: params.propertyId,
          meterType: params.meterType,
          activeOnly: params.activeOnly,
        })}`,
      ),
  });
}

export function useCreateUtilityTariff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UtilityTariffInput) =>
      apiFetch<UtilityTariff>('/utility-tariffs', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utility-tariffs'] });
    },
  });
}

/**
 * `isActive` n'appartient pas à `UtilityTariffInput` (c'est un champ dérivé de
 * `UtilityTariff`, jamais saisi à la création) : élargi ici pour permettre la
 * désactivation/réactivation d'un tarif, qui ne se supprime jamais.
 */
export function useUpdateUtilityTariff(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<UtilityTariffInput> & { isActive?: boolean }) =>
      apiFetch<UtilityTariff>(`/utility-tariffs/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utility-tariffs'] });
    },
  });
}

/**
 * Variante de `useUpdateUtilityTariff` dont l'identifiant est fourni à l'appel
 * plutôt qu'à l'instanciation du hook : nécessaire pour une action déclenchée
 * depuis une liste (bascule active/inactive), où l'identifiant change à
 * chaque ligne et ne peut pas être figé dans une fermeture de rendu précédent.
 */
export function useSetTariffActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch<UtilityTariff>(`/utility-tariffs/${id}`, { method: 'PATCH', body: { isActive } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utility-tariffs'] });
    },
  });
}
