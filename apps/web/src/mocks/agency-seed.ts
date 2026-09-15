/**
 * Mock MSW — Phase 7 (gestion d'agence), état en mémoire et données de
 * démonstration, conformes à docs/api/phase7-contract.md. Suit le principe de
 * billing-seed.ts : Maps exportées, types `*Mock` locaux (indépendants de
 * '@/lib/api/types', qui représente le contrat côté client).
 */

export type MandateStatusMock = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'EXPIRED';
export type MandateScopeMock = 'FULL_MANAGEMENT' | 'RENT_COLLECTION_ONLY' | 'LETTING_ONLY';
export type CommissionBasisMock =
  | 'RATE_BPS_ON_RENT_COLLECTED'
  | 'RATE_BPS_ON_RENT_DUE'
  | 'FLAT_AMOUNT_PER_MONTH'
  | 'FLAT_AMOUNT_PER_LEASE';
export type CommissionStatusMock = 'PENDING' | 'ACCRUED' | 'INVOICED' | 'SETTLED' | 'CANCELLED';
export type ExpenseStatusMock =
  'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'REBILLED' | 'REJECTED' | 'CANCELLED';
export type ExpenseBearerMock = 'LANDLORD' | 'TENANT' | 'ORGANIZATION';
export type ExpenseCategoryMock =
  | 'REPAIR'
  | 'MAINTENANCE'
  | 'PLUMBING'
  | 'ELECTRICITY'
  | 'CLEANING'
  | 'SECURITY'
  | 'UTILITY_BILL'
  | 'TAX'
  | 'INSURANCE'
  | 'SYNDIC_FEE'
  | 'LEGAL_FEE'
  | 'TRAVEL'
  | 'SUPPLIES'
  | 'OTHER';
export type OwnerStatementStatusMock = 'DRAFT' | 'ISSUED' | 'SENT' | 'PAID' | 'CANCELLED';
export type OwnerStatementLineTypeMock =
  | 'RENT_COLLECTED'
  | 'CHARGE_COLLECTED'
  | 'COMMISSION'
  | 'EXPENSE'
  | 'VAT'
  | 'DEPOSIT_HELD'
  | 'CARRY_FORWARD'
  | 'ADJUSTMENT'
  | 'OTHER';
export type PayoutStatusMock =
  'PENDING' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED';
export type FeeBearerMock = 'TENANT' | 'ORGANIZATION' | 'LANDLORD' | 'SHARED';

export interface MockMandate {
  id: string;
  organizationId: string;
  reference: string;
  landlordId: string;
  propertyIds: string[];
  scope: MandateScopeMock;
  status: MandateStatusMock;
  startDate: string;
  endDate: string | null;
  noticeDays: number;
  autoRenew: boolean;
  commissionBasis: CommissionBasisMock;
  commissionRateBps: number | null;
  commissionFlatAmount: number | null;
  lettingFeeRateBps: number | null;
  vatRateBps: number;
  payoutDay: number;
  payoutBankAccountId: string | null;
  notes: string | null;
  signedAt: string | null;
  terminatedAt: string | null;
  terminationReason: string | null;
  invitedAt: string | null;
  invitationToken: string | null;
  createdAt: string;
}

export interface MockExpense {
  id: string;
  organizationId: string;
  reference: string;
  propertyId: string | null;
  unitId: string | null;
  leaseId: string | null;
  landlordId: string | null;
  category: ExpenseCategoryMock;
  label: string;
  description: string | null;
  supplierName: string | null;
  supplierPhone: string | null;
  supplierNiu: string | null;
  amount: number;
  vatRateBps: number;
  vatAmount: number;
  totalAmount: number;
  expenseDate: string;
  borneBy: ExpenseBearerMock;
  isRebillable: boolean;
  isDeductibleFromRent: boolean;
  invoiceDocumentId: string | null;
  clientRef: string | null;
  notes: string | null;
  status: ExpenseStatusMock;
  ownerStatementId: string | null;
  approvedByUserId: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface MockCommission {
  id: string;
  organizationId: string;
  mandateId: string | null;
  landlordId: string;
  leaseId: string | null;
  paymentId: string | null;
  status: CommissionStatusMock;
  basis: CommissionBasisMock;
  periodStart: string;
  periodEnd: string;
  baseAmount: number;
  rateBps: number | null;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  ownerStatementId: string | null;
  reversalOfId: string | null;
  createdAt: string;
}

export interface MockOwnerStatementLine {
  id: string;
  lineType: OwnerStatementLineTypeMock;
  label: string;
  amount: number;
  isDebit: boolean;
  position: number;
  propertyId: string | null;
  unitId: string | null;
  leaseId: string | null;
  tenantId: string | null;
  invoiceId: string | null;
  paymentId: string | null;
  expenseId: string | null;
  commissionId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface MockOwnerStatement {
  id: string;
  organizationId: string;
  statementNumber: string;
  status: OwnerStatementStatusMock;
  landlordId: string;
  propertyId: string | null;
  mandateId: string | null;
  periodStart: string;
  periodEnd: string;
  rentCollectedAmount: number;
  chargesCollectedAmount: number;
  commissionAmount: number;
  commissionVatAmount: number;
  expensesAmount: number;
  depositsHeldAmount: number;
  carryForwardAmount: number;
  netPayableAmount: number;
  occupancyRateBps: number | null;
  collectionRateBps: number | null;
  documentId: string | null;
  lines: MockOwnerStatementLine[];
  issuedAt: string | null;
  sentAt: string | null;
  settledAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
}

export interface MockPayout {
  id: string;
  organizationId: string;
  reference: string;
  statementId: string | null;
  landlordId: string;
  status: PayoutStatusMock;
  method: 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'BANK_CHECK';
  amount: number;
  feeAmount: number;
  feeBearer: FeeBearerMock;
  netAmount: number;
  bankAccountId: string | null;
  momoTransactionId: string | null;
  scheduledDate: string | null;
  approvedByUserId: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  failureReason: string | null;
  proofDocumentId: string | null;
  createdAt: string;
}

export const mandates = new Map<string, MockMandate>();
export const expenses = new Map<string, MockExpense>();
export const commissions = new Map<string, MockCommission>();
export const ownerStatements = new Map<string, MockOwnerStatement>();
export const payouts = new Map<string, MockPayout>();
/** Jeton d'invitation portail -> mandat, produit par POST .../landlord-invitation. */
export const landlordInvitationTokens = new Map<
  string,
  { mandateId: string; organizationId: string; landlordId: string }
>();

let mandateSeq = 0;
export function nextMandateReference(year: string): string {
  mandateSeq += 1;
  return `MDT-${year}-${String(mandateSeq).padStart(3, '0')}`;
}

let expenseSeq = 0;
export function nextExpenseReference(yearMonth: string): string {
  expenseSeq += 1;
  return `DEP-${yearMonth.replace('-', '')}-${String(expenseSeq).padStart(4, '0')}`;
}

let statementSeq = 0;
export function nextStatementNumber(yearMonth: string): string {
  statementSeq += 1;
  return `REL-${yearMonth.replace('-', '')}-${String(statementSeq).padStart(4, '0')}`;
}

let payoutSeq = 0;
export function nextPayoutReference(yearMonth: string): string {
  payoutSeq += 1;
  return `REV-${yearMonth.replace('-', '')}-${String(payoutSeq).padStart(4, '0')}`;
}

export interface SeedAgencyDeps {
  DEMO_ORG_ID: string;
  nextId: (prefix: string) => string;
  landlordId: string;
  propertyId: string;
}

/**
 * Un unique mandat ACTIF de démonstration (gestion complète, commission 10 %,
 * TVA 18 %) sur le premier bien de l'organisation de démonstration. Les
 * dépenses et relevés de démonstration ne sont pas pré-semés : ils naissent
 * des écrans (saisie de dépense, lancement de campagne) comme en e2e.
 */
export function seedAgencyDemoData(deps: SeedAgencyDeps): void {
  const { DEMO_ORG_ID, nextId, landlordId, propertyId } = deps;
  const now = new Date().toISOString();
  const mandate: MockMandate = {
    id: nextId('mandate'),
    organizationId: DEMO_ORG_ID,
    reference: nextMandateReference(now.slice(0, 4)),
    landlordId,
    propertyIds: [propertyId],
    scope: 'FULL_MANAGEMENT',
    status: 'ACTIVE',
    startDate: now.slice(0, 10),
    endDate: null,
    noticeDays: 90,
    autoRenew: true,
    commissionBasis: 'RATE_BPS_ON_RENT_COLLECTED',
    commissionRateBps: 1000,
    commissionFlatAmount: null,
    lettingFeeRateBps: null,
    vatRateBps: 1800,
    payoutDay: 10,
    payoutBankAccountId: null,
    notes: null,
    signedAt: now,
    terminatedAt: null,
    terminationReason: null,
    invitedAt: null,
    invitationToken: null,
    createdAt: now,
  };
  mandates.set(mandate.id, mandate);
}
