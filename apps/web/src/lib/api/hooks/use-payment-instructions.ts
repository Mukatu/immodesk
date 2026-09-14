import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { PaymentInstructions } from '@/lib/api/types';

export function useInvoicePaymentInstructions(invoiceId: string | null) {
  return useQuery({
    queryKey: ['payment-instructions', 'invoice', invoiceId],
    queryFn: () => apiFetch<PaymentInstructions>(`/invoices/${invoiceId}/payment-instructions`),
    enabled: Boolean(invoiceId),
  });
}

export function useLeasePaymentInstructions(leaseId: string | null) {
  return useQuery({
    queryKey: ['payment-instructions', 'lease', leaseId],
    queryFn: () => apiFetch<PaymentInstructions>(`/leases/${leaseId}/payment-instructions`),
    enabled: Boolean(leaseId),
  });
}
