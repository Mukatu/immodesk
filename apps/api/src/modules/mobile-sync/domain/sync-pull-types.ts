/** Vues allégées du périmètre du démarcheur (docs/api/phase5-contract.md, § pull). */
export interface PropertySummary {
  id: string;
  name: string;
  addressLine: string;
  district: string | null;
  updatedAt: string;
}

export interface UnitSummary {
  id: string;
  propertyId: string;
  code: string;
  status: string;
  updatedAt: string;
}

export interface TenantSummary {
  id: string;
  displayName: string;
  primaryPhone: string | null;
  updatedAt: string;
}

export interface LeaseSummary {
  id: string;
  unitId: string;
  propertyId: string;
  primaryTenantId: string;
  reference: string;
  status: string;
  rentAmount: number;
  chargesAmount: number;
  collectorUserId: string | null;
  updatedAt: string;
}

export interface InvoiceSummary {
  id: string;
  leaseId: string;
  tenantId: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  dueDate: string;
  updatedAt: string;
}

export interface CashReceiptSummary {
  id: string;
  leaseId: string | null;
  tenantId: string;
  receiptNumber: string;
  status: string;
  amount: number;
  receivedAt: string;
  updatedAt: string;
}

export interface RemittanceSummary {
  id: string;
  reference: string;
  status: string;
  declaredAmount: number;
  receiptsCount: number;
  updatedAt: string;
}

export interface SyncPullResult {
  serverTime: string;
  nextCursor: string;
  hasMore: boolean;
  retentionHours: number;
  changed: {
    properties: PropertySummary[];
    units: UnitSummary[];
    tenants: TenantSummary[];
    leases: LeaseSummary[];
    invoices: InvoiceSummary[];
    cashReceipts: CashReceiptSummary[];
    remittances: RemittanceSummary[];
  };
  deleted: Array<{ resourceType: string; id: string }>;
}
