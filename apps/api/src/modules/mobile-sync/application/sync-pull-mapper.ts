import { toJsonAmount } from '../../../shared/money/amount';
import { displayNameOf, type PartyType } from '../../parties/domain/party-rules';
import type {
  CashReceiptSummary,
  InvoiceSummary,
  LeaseSummary,
  PropertySummary,
  RemittanceSummary,
  TenantSummary,
  UnitSummary,
} from '../domain/sync-pull-types';

export function toPropertySummary(row: any): PropertySummary {
  return {
    id: row.id,
    name: row.name,
    addressLine: row.address_line,
    district: row.district ?? null,
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toUnitSummary(row: any): UnitSummary {
  return {
    id: row.id,
    propertyId: row.property_id,
    code: row.code,
    status: row.status,
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toTenantSummary(row: any): TenantSummary {
  return {
    id: row.id,
    displayName: displayNameOf({
      partyType: row.party_type as PartyType,
      firstName: row.first_name,
      lastName: row.last_name,
      companyName: row.company_name,
    }),
    primaryPhone: row.primary_phone ?? null,
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toLeaseSummary(row: any): LeaseSummary {
  return {
    id: row.id,
    unitId: row.unit_id,
    propertyId: row.property_id,
    primaryTenantId: row.primary_tenant_id,
    reference: row.reference,
    status: row.status,
    rentAmount: toJsonAmount(row.rent_amount),
    chargesAmount: toJsonAmount(row.charges_amount),
    collectorUserId: row.collector_user_id ?? null,
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toInvoiceSummary(row: any): InvoiceSummary {
  return {
    id: row.id,
    leaseId: row.lease_id,
    tenantId: row.tenant_id,
    invoiceNumber: row.invoice_number,
    status: row.status,
    totalAmount: toJsonAmount(row.total_amount),
    paidAmount: toJsonAmount(row.paid_amount),
    balanceAmount: toJsonAmount(row.balance_amount),
    dueDate: row.due_date.toISOString().slice(0, 10),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toCashReceiptSummary(row: any): CashReceiptSummary {
  return {
    id: row.id,
    leaseId: row.lease_id ?? null,
    tenantId: row.tenant_id,
    receiptNumber: row.receipt_number,
    status: row.status,
    amount: toJsonAmount(row.amount),
    receivedAt: row.received_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toRemittanceSummary(row: any): RemittanceSummary {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    declaredAmount: toJsonAmount(row.declared_amount),
    receiptsCount: row.receipts_count,
    updatedAt: row.updated_at.toISOString(),
  };
}
