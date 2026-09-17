import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  ArrearsDashboard,
  ArrearsDashboardQuery,
  CollectionRateDashboard,
  CollectionRateDashboardQuery,
  PaymentMethodsDashboard,
  PaymentMethodsDashboardQuery,
  VacancyDashboard,
  VacancyDashboardQuery,
} from '@/lib/api/types';

function buildQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as [string, string | undefined][]) {
    if (value === undefined || value === '') continue;
    search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/** Quatre agrégats en lecture seule (phase 9), accessibles au rôle VIEWER. */
export function useCollectionRateDashboard(query: CollectionRateDashboardQuery) {
  return useQuery({
    queryKey: ['dashboards', 'collection-rate', query],
    queryFn: () =>
      apiFetch<CollectionRateDashboard>(`/dashboards/collection-rate${buildQuery(query)}`),
  });
}

export function useArrearsDashboard(query: ArrearsDashboardQuery) {
  return useQuery({
    queryKey: ['dashboards', 'arrears', query],
    queryFn: () => apiFetch<ArrearsDashboard>(`/dashboards/arrears${buildQuery(query)}`),
  });
}

export function useVacancyDashboard(query: VacancyDashboardQuery) {
  return useQuery({
    queryKey: ['dashboards', 'vacancy', query],
    queryFn: () => apiFetch<VacancyDashboard>(`/dashboards/vacancy${buildQuery(query)}`),
  });
}

export function usePaymentMethodsDashboard(query: PaymentMethodsDashboardQuery) {
  return useQuery({
    queryKey: ['dashboards', 'payment-methods', query],
    queryFn: () =>
      apiFetch<PaymentMethodsDashboard>(`/dashboards/payment-methods${buildQuery(query)}`),
  });
}
