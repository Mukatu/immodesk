import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  AddInspectionPhotoBody,
  ConvertToMaintenanceRequestBody,
  DepositDeductionBody,
  DepositMovement,
  DisputeInspectionBody,
  Inspection,
  InspectionComparison,
  InspectionDetail,
  InspectionInput,
  InspectionItem,
  InspectionItemInput,
  InspectionPatchBody,
  InspectionPdfResponse,
  InspectionPhoto,
  InspectionStatus,
  InspectionSummary,
  InspectionType,
  MaintenanceDetail,
  Paginated,
  SignInspectionBody,
} from '@/lib/api/types';

export interface UseInspectionsParams {
  unitId?: string;
  leaseId?: string;
  type?: InspectionType;
  status?: InspectionStatus;
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

export function useInspections(params: UseInspectionsParams = {}) {
  return useQuery({
    queryKey: ['inspections', params],
    queryFn: () =>
      apiFetch<Paginated<InspectionSummary>>(
        `/inspections${buildQuery({
          unitId: params.unitId,
          leaseId: params.leaseId,
          type: params.type,
          status: params.status,
          cursor: params.cursor,
          limit: params.limit,
        })}`,
      ),
  });
}

export function useInspection(id: string | null) {
  return useQuery({
    queryKey: ['inspections', id],
    queryFn: () => apiFetch<InspectionDetail>(`/inspections/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: InspectionInput) =>
      apiFetch<Inspection>('/inspections', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
    },
  });
}

export function useUpdateInspection(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: InspectionPatchBody) =>
      apiFetch<Inspection>(`/inspections/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      queryClient.invalidateQueries({ queryKey: ['inspections', id] });
    },
  });
}

// ---- Postes ----

export function useCreateInspectionItem(inspectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: InspectionItemInput) =>
      apiFetch<InspectionItem>(`/inspections/${inspectionId}/items`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections', inspectionId] });
    },
  });
}

export function useUpdateInspectionItem(inspectionId: string, itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<InspectionItemInput>) =>
      apiFetch<InspectionItem>(`/inspections/${inspectionId}/items/${itemId}`, {
        method: 'PATCH',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections', inspectionId] });
    },
  });
}

export function useDeleteInspectionItem(inspectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiFetch<void>(`/inspections/${inspectionId}/items/${itemId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections', inspectionId] });
    },
  });
}

// ---- Photos ----

export function useAddInspectionItemPhoto(inspectionId: string, itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddInspectionPhotoBody) =>
      apiFetch<InspectionPhoto>(`/inspections/${inspectionId}/items/${itemId}/photos`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections', inspectionId] });
    },
  });
}

// ---- Transitions ----

export function useSignInspection(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SignInspectionBody) =>
      apiFetch<InspectionDetail>(`/inspections/${id}/sign`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      queryClient.invalidateQueries({ queryKey: ['inspections', id] });
    },
  });
}

export function useDisputeInspection(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DisputeInspectionBody) =>
      apiFetch<Inspection>(`/inspections/${id}/dispute`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      queryClient.invalidateQueries({ queryKey: ['inspections', id] });
    },
  });
}

export function useCancelInspection(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<Inspection>(`/inspections/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      queryClient.invalidateQueries({ queryKey: ['inspections', id] });
    },
  });
}

export function useInspectionPdf(id: string | null) {
  return useQuery({
    queryKey: ['inspections', id, 'pdf'],
    queryFn: () => apiFetch<InspectionPdfResponse>(`/inspections/${id}/pdf`),
    enabled: false,
  });
}

// ---- Comparaison entrée/sortie ----

export function useInspectionComparison(unitId: string | null) {
  return useQuery({
    queryKey: ['units', unitId, 'inspections', 'compare'],
    queryFn: () => apiFetch<InspectionComparison>(`/units/${unitId}/inspections/compare`),
    enabled: Boolean(unitId),
  });
}

// ---- Retenue sur dépôt et conversion en maintenance ----

export function useCreateDepositDeduction(inspectionId: string, itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DepositDeductionBody) =>
      apiFetch<DepositMovement>(`/inspections/${inspectionId}/items/${itemId}/deposit-deduction`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections', inspectionId] });
    },
  });
}

export function useConvertInspectionItemToMaintenance(inspectionId: string, itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ConvertToMaintenanceRequestBody) =>
      apiFetch<MaintenanceDetail>(
        `/inspections/${inspectionId}/items/${itemId}/maintenance-request`,
        { method: 'POST', body },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections', inspectionId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
    },
  });
}
