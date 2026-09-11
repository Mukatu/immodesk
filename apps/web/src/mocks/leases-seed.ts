/**
 * Mock MSW — Phase 2 (baux et dépôts de garantie), données de démonstration.
 * Isolé de handlers.ts pour lisibilité : les Maps/tiers déjà seedés en phase 1
 * (immeubles, lots, locataires) sont injectés via seedLeasesDemoData plutôt que
 * réimportés directement, pour éviter tout couplage fort avec handlers.ts.
 */

// ---- Énumérations locales (recopiées du contrat, cohérent avec le style de handlers.ts) ----

export type LeaseStatusMock =
  | 'DRAFT'
  | 'PENDING_SIGNATURE'
  | 'ACTIVE'
  | 'NOTICE_GIVEN'
  | 'TERMINATED'
  | 'EXPIRED'
  | 'CANCELLED';

export type RentPeriodMock = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';

export type LeasePartyRoleMock = 'PRIMARY_TENANT' | 'CO_TENANT' | 'GUARANTOR' | 'OCCUPANT';

export type LeaseDocumentKindMock =
  'CONTRACT' | 'AMENDMENT' | 'NOTICE' | 'TERMINATION' | 'INVENTORY' | 'INSURANCE' | 'OTHER';

export type DepositStatusMock =
  'PENDING' | 'PARTIALLY_PAID' | 'HELD' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'FORFEITED';

export type DepositMovementTypeMock =
  'COLLECTION' | 'REFUND' | 'DEDUCTION' | 'TRANSFER' | 'ADJUSTMENT';

export type PaymentMethodMock = 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'BANK_CHECK';

export type ContractJobStatusMock = 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED';

// ---- Types Mock (champs = interfaces du contrat + organizationId) ----

export interface MockLease {
  id: string;
  organizationId: string;
  unitId: string;
  primaryTenantId: string;
  startDate: string;
  endDate: string | null;
  moveInDate?: string;
  rentPeriod: RentPeriodMock;
  rentAmount: number;
  chargesAmount: number;
  chargesAreProvisional: boolean;
  depositAmount?: number;
  agencyFeeAmount?: number;
  advanceMonths?: number;
  paymentDueDay: number;
  graceDays: number;
  preferredPaymentMethod?: PaymentMethodMock;
  collectorUserId?: string;
  noticeDays: number;
  autoRenew: boolean;
  indexationRateBps?: number;
  nextIndexationDate?: string;
  notes?: string;
  clientRef?: string;
  reference: string | null;
  status: LeaseStatusMock;
  propertyId: string;
  landlordId: string;
  moveOutDate: string | null;
  currency: 'XAF';
  signedAt: string | null;
  terminatedAt: string | null;
  terminationReason: string | null;
  balanceAmount: number;
  contractDocumentId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MockLeaseParty {
  id: string;
  organizationId: string;
  leaseId: string;
  role: LeasePartyRoleMock;
  tenantId?: string;
  guarantorId?: string;
  shareBps?: number;
  isSolidary?: boolean;
  displayName: string;
  signedAt: string | null;
  createdAt: string;
}

export interface MockRentRevision {
  id: string;
  organizationId: string;
  leaseId: string;
  effectiveDate: string;
  previousRentAmount: number;
  newRentAmount: number;
  previousChargesAmount: number;
  newChargesAmount: number;
  reason: string | null;
  documentId: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface MockLeaseDocument {
  id: string;
  organizationId: string;
  leaseId: string;
  kind: LeaseDocumentKindMock;
  documentId: string;
  version: number;
  title: string;
  effectiveDate: string | null;
  isSigned: boolean;
  signedAt: string | null;
  signatureHash: string | null;
  generatedByJob: string | null;
  createdAt: string;
}

export interface MockDepositMovement {
  id: string;
  organizationId: string;
  depositId: string;
  leaseId: string;
  movementType: DepositMovementTypeMock;
  amount: number;
  movementDate?: string;
  reason?: string;
  paymentId?: string;
  inspectionId?: string;
  reversalOfId?: string;
  currency: 'XAF';
  createdByUserId: string | null;
  createdAt: string;
}

export interface MockDeposit {
  id: string;
  organizationId: string;
  leaseId: string;
  tenantId: string;
  status: DepositStatusMock;
  requiredAmount: number;
  collectedAmount: number;
  deductedAmount: number;
  refundedAmount: number;
  heldAmount: number;
  monthsEquivalent: number | null;
  dueDate: string | null;
  fullyCollectedAt: string | null;
  refundDueDate: string | null;
  refundedAt: string | null;
  refundBankAccountId: string | null;
}

export interface MockContractJob {
  jobId: string;
  organizationId: string;
  leaseId: string;
  status: ContractJobStatusMock;
  leaseDocumentId?: string;
  error?: string;
  pollCount: number;
  createdAt: string;
}

export interface MockContractClause {
  key: string;
  title: string;
  body: string;
  enabled: boolean;
}

export interface MockContractTemplate {
  organizationId: string;
  headerTitle: string;
  lessorBlock: string;
  optionalClauses: MockContractClause[];
  legalMentions: string;
  signatureCity: string;
  showOhadaBlock: boolean;
  footerText: string | null;
}

// ---- État en mémoire ----

export const leases = new Map<string, MockLease>();
export const leaseParties = new Map<string, MockLeaseParty>();
export const rentRevisions = new Map<string, MockRentRevision>();
export const leaseDocuments = new Map<string, MockLeaseDocument>();
/** Clé = leaseId (un seul dépôt par bail). */
export const deposits = new Map<string, MockDeposit>();
export const depositMovements = new Map<string, MockDepositMovement>();
export const contractJobs = new Map<string, MockContractJob>();
/** Clé = organizationId. */
export const contractTemplates = new Map<string, MockContractTemplate>();

/**
 * Statut dérivé d'un dépôt de garantie (règle du contrat, section « Dépôt ») :
 * PENDING (rien encaissé) → PARTIALLY_PAID (encaissement partiel) → HELD
 * (intégralement encaissé et détenu) → PARTIALLY_REFUNDED/REFUNDED (restitution
 * partielle ou totale) ; FORFEITED si une déduction a absorbé tout le solde détenu
 * sans restitution.
 */
export function computeDepositStatus(deposit: {
  requiredAmount: number;
  collectedAmount: number;
  deductedAmount: number;
  refundedAmount: number;
}): DepositStatusMock {
  const { requiredAmount, collectedAmount, deductedAmount, refundedAmount } = deposit;
  const heldAmount = collectedAmount - deductedAmount - refundedAmount;

  if (collectedAmount <= 0) return 'PENDING';
  if (collectedAmount < requiredAmount) return 'PARTIALLY_PAID';
  if (heldAmount <= 0) {
    if (refundedAmount > 0) return 'REFUNDED';
    if (deductedAmount > 0) return 'FORFEITED';
    return 'HELD';
  }
  if (refundedAmount > 0 || deductedAmount > 0) return 'PARTIALLY_REFUNDED';
  return 'HELD';
}

export const DEFAULT_CONTRACT_TEMPLATE: Omit<MockContractTemplate, 'organizationId'> = {
  headerTitle: "CONTRAT DE BAIL À USAGE D'HABITATION",
  lessorBlock: '',
  optionalClauses: [
    {
      key: 'solidarity',
      title: 'Clause de solidarité',
      body: "Les colocataires et leurs garants sont tenus solidairement et indivisiblement au paiement du loyer et des charges, ainsi qu'à l'exécution de toutes les obligations résultant du présent bail.",
      enabled: false,
    },
    {
      key: 'resolutory',
      title: 'Clause résolutoire',
      body: "À défaut de paiement à son terme d'un seul terme de loyer ou de charges, ou en cas d'inexécution d'une des clauses du présent bail, le contrat sera résilié de plein droit un mois après un commandement de payer resté sans effet.",
      enabled: false,
    },
  ],
  legalMentions:
    'Le présent contrat est établi conformément à la réglementation en vigueur en République du Congo. Toute contestation relative à son exécution relève des juridictions compétentes de Brazzaville.',
  signatureCity: 'Brazzaville',
  showOhadaBlock: false,
  footerText: null,
};

// ---- Seed de démonstration ----
// Import de type uniquement : erasé à la compilation, ne crée donc aucun cycle
// d'import à l'exécution avec handlers.ts (qui importe des valeurs de ce fichier
// via leases-handlers.ts).
import type { MockProperty, MockTenant, MockUnit } from './handlers';

export interface SeedLeasesDeps {
  properties: Map<string, MockProperty>;
  units: Map<string, MockUnit>;
  tenants: Map<string, MockTenant>;
  DEMO_ORG_ID: string;
  nextId: (prefix: string) => string;
  normalizePhone: (raw: string) => string | null;
}

function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

/** Ajoute des données de démonstration phase 2 par-dessus le seed phase 1 déjà en place. */
export function seedLeasesDemoData(deps: SeedLeasesDeps): void {
  const { properties, units, tenants, DEMO_ORG_ID, nextId, normalizePhone } = deps;
  const now = new Date().toISOString();

  const existingProperties = [...properties.values()].filter(
    (p) => p.organizationId === DEMO_ORG_ID && !p.deletedAt,
  );
  const landlordId = existingProperties[0]?.landlordId ?? nextId('landlord');

  const mpila: MockProperty = {
    id: nextId('property'),
    organizationId: DEMO_ORG_ID,
    landlordId,
    code: 'IMM-003',
    name: 'Résidence Mpila',
    propertyType: 'APARTMENT_BUILDING',
    addressLine: 'Avenue de la Tsiémé',
    district: 'Mpila',
    city: 'Brazzaville',
    countryCode: 'CG',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  properties.set(mpila.id, mpila);

  const unitDefs: Array<[string, MockUnit['status'], number]> = [
    ['M01', 'AVAILABLE', 130000],
    ['M02', 'AVAILABLE', 130000],
    ['M03', 'OCCUPIED', 120000],
    ['M04', 'OCCUPIED', 150000],
  ];
  const mpilaUnits = unitDefs.map(([code, status, baseRentAmount]) => {
    const unit: MockUnit = {
      id: nextId('unit'),
      organizationId: DEMO_ORG_ID,
      propertyId: mpila.id,
      code,
      unitType: 'APARTMENT',
      status,
      depositMonths: 2,
      baseRentAmount,
      currency: 'XAF',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    units.set(unit.id, unit);
    return unit;
  });
  const unitM03 = mpilaUnits[2]!;
  const unitM04 = mpilaUnits[3]!;

  const existingTenants = [...tenants.values()].filter(
    (t) => t.organizationId === DEMO_ORG_ID && !t.deletedAt,
  );
  function ensureTenant(index: number, firstName: string, lastName: string): MockTenant {
    const existing = existingTenants[index];
    if (existing) return existing;
    const phone = normalizePhone(`06${(6000000 + index).toString().slice(-7)}`);
    const tenant: MockTenant = {
      id: nextId('tenant'),
      organizationId: DEMO_ORG_ID,
      partyType: 'INDIVIDUAL',
      firstName,
      lastName,
      primaryPhone: phone ?? '+242060000000',
      city: 'Brazzaville',
      countryCode: 'CG',
      currency: 'XAF',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    tenants.set(tenant.id, tenant);
    existingTenants.push(tenant);
    return tenant;
  }
  const tenantA = ensureTenant(0, 'Serge', 'Loubassou');
  const tenantB = ensureTenant(1, 'Grace', 'Ondongo');

  const otherOccupiedUnit = [...units.values()].find(
    (u) => u.status === 'OCCUPIED' && u.propertyId !== mpila.id && !u.deletedAt,
  );
  const unitC = otherOccupiedUnit ?? unitM03;
  const propertyC = properties.get(unitC.propertyId) ?? mpila;

  // ---- Bail (a) : ACTIVE, dépôt HELD, une révision de loyer, un co-tenant ----
  const leaseA: MockLease = {
    id: nextId('lease'),
    organizationId: DEMO_ORG_ID,
    unitId: unitM03.id,
    primaryTenantId: tenantA.id,
    startDate: isoDate(-180),
    endDate: null,
    moveInDate: isoDate(-180),
    rentPeriod: 'MONTHLY',
    rentAmount: 120000,
    chargesAmount: 0,
    chargesAreProvisional: false,
    depositAmount: 240000,
    paymentDueDay: 5,
    graceDays: 3,
    noticeDays: 90,
    autoRenew: false,
    reference: `BAIL-${new Date().getFullYear()}-1`,
    status: 'ACTIVE',
    propertyId: mpila.id,
    landlordId,
    moveOutDate: null,
    currency: 'XAF',
    signedAt: isoDate(-181),
    terminatedAt: null,
    terminationReason: null,
    balanceAmount: 0,
    contractDocumentId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  leases.set(leaseA.id, leaseA);

  const rentRevisionA: MockRentRevision = {
    id: nextId('rentrev'),
    organizationId: DEMO_ORG_ID,
    leaseId: leaseA.id,
    effectiveDate: isoDate(-60),
    previousRentAmount: 110000,
    newRentAmount: 120000,
    previousChargesAmount: 0,
    newChargesAmount: 0,
    reason: 'Révision annuelle',
    documentId: null,
    createdByUserId: null,
    createdAt: now,
  };
  rentRevisions.set(rentRevisionA.id, rentRevisionA);

  const depositA: MockDeposit = {
    id: nextId('deposit'),
    organizationId: DEMO_ORG_ID,
    leaseId: leaseA.id,
    tenantId: tenantA.id,
    status: 'PENDING',
    requiredAmount: 240000,
    collectedAmount: 240000,
    deductedAmount: 0,
    refundedAmount: 0,
    heldAmount: 240000,
    monthsEquivalent: 2,
    dueDate: leaseA.startDate,
    fullyCollectedAt: leaseA.startDate,
    refundDueDate: null,
    refundedAt: null,
    refundBankAccountId: null,
  };
  depositA.status = computeDepositStatus(depositA);
  deposits.set(leaseA.id, depositA);

  const depositMovementA: MockDepositMovement = {
    id: nextId('depmvt'),
    organizationId: DEMO_ORG_ID,
    depositId: depositA.id,
    leaseId: leaseA.id,
    movementType: 'COLLECTION',
    amount: 240000,
    movementDate: leaseA.startDate,
    reason: 'Encaissement du dépôt à la signature',
    currency: 'XAF',
    createdByUserId: null,
    createdAt: now,
  };
  depositMovements.set(depositMovementA.id, depositMovementA);

  const leaseAPrimary: MockLeaseParty = {
    id: nextId('leaseparty'),
    organizationId: DEMO_ORG_ID,
    leaseId: leaseA.id,
    role: 'PRIMARY_TENANT',
    tenantId: tenantA.id,
    shareBps: 10000,
    isSolidary: true,
    displayName: `${tenantA.firstName ?? ''} ${tenantA.lastName ?? ''}`.trim(),
    signedAt: leaseA.signedAt,
    createdAt: now,
  };
  leaseParties.set(leaseAPrimary.id, leaseAPrimary);

  const leaseACoTenant: MockLeaseParty = {
    id: nextId('leaseparty'),
    organizationId: DEMO_ORG_ID,
    leaseId: leaseA.id,
    role: 'CO_TENANT',
    tenantId: tenantB.id,
    isSolidary: false,
    displayName: `${tenantB.firstName ?? ''} ${tenantB.lastName ?? ''}`.trim(),
    signedAt: leaseA.signedAt,
    createdAt: now,
  };
  leaseParties.set(leaseACoTenant.id, leaseACoTenant);

  // ---- Bail (b) : ACTIVE, endDate dans 60 jours, dépôt PARTIALLY_PAID ----
  const leaseB: MockLease = {
    id: nextId('lease'),
    organizationId: DEMO_ORG_ID,
    unitId: unitM04.id,
    primaryTenantId: tenantB.id,
    startDate: isoDate(-365),
    endDate: isoDate(60),
    moveInDate: isoDate(-365),
    rentPeriod: 'MONTHLY',
    rentAmount: 150000,
    chargesAmount: 0,
    chargesAreProvisional: false,
    depositAmount: 300000,
    paymentDueDay: 5,
    graceDays: 3,
    noticeDays: 90,
    autoRenew: false,
    reference: `BAIL-${new Date().getFullYear()}-2`,
    status: 'ACTIVE',
    propertyId: mpila.id,
    landlordId,
    moveOutDate: null,
    currency: 'XAF',
    signedAt: isoDate(-366),
    terminatedAt: null,
    terminationReason: null,
    balanceAmount: 0,
    contractDocumentId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  leases.set(leaseB.id, leaseB);

  const depositB: MockDeposit = {
    id: nextId('deposit'),
    organizationId: DEMO_ORG_ID,
    leaseId: leaseB.id,
    tenantId: tenantB.id,
    status: 'PENDING',
    requiredAmount: 300000,
    collectedAmount: 100000,
    deductedAmount: 0,
    refundedAmount: 0,
    heldAmount: 100000,
    monthsEquivalent: 2,
    dueDate: leaseB.startDate,
    fullyCollectedAt: null,
    refundDueDate: null,
    refundedAt: null,
    refundBankAccountId: null,
  };
  depositB.status = computeDepositStatus(depositB);
  deposits.set(leaseB.id, depositB);

  const depositMovementB: MockDepositMovement = {
    id: nextId('depmvt'),
    organizationId: DEMO_ORG_ID,
    depositId: depositB.id,
    leaseId: leaseB.id,
    movementType: 'COLLECTION',
    amount: 100000,
    movementDate: leaseB.startDate,
    reason: 'Premier versement du dépôt',
    currency: 'XAF',
    createdByUserId: null,
    createdAt: now,
  };
  depositMovements.set(depositMovementB.id, depositMovementB);

  const leaseBPrimary: MockLeaseParty = {
    id: nextId('leaseparty'),
    organizationId: DEMO_ORG_ID,
    leaseId: leaseB.id,
    role: 'PRIMARY_TENANT',
    tenantId: tenantB.id,
    shareBps: 10000,
    isSolidary: false,
    displayName: `${tenantB.firstName ?? ''} ${tenantB.lastName ?? ''}`.trim(),
    signedAt: leaseB.signedAt,
    createdAt: now,
  };
  leaseParties.set(leaseBPrimary.id, leaseBPrimary);

  // ---- Bail (c) : NOTICE_GIVEN, préavis proche, dépôt HELD ----
  const rentC = unitC.baseRentAmount;
  const requiredC = Math.round(rentC * (unitC.depositMonths ?? 2));
  const leaseC: MockLease = {
    id: nextId('lease'),
    organizationId: DEMO_ORG_ID,
    unitId: unitC.id,
    primaryTenantId: tenantA.id,
    startDate: isoDate(-300),
    endDate: isoDate(20),
    moveInDate: isoDate(-300),
    rentPeriod: 'MONTHLY',
    rentAmount: rentC,
    chargesAmount: 0,
    chargesAreProvisional: false,
    depositAmount: requiredC,
    paymentDueDay: 5,
    graceDays: 3,
    noticeDays: 90,
    autoRenew: false,
    reference: `BAIL-${new Date().getFullYear()}-3`,
    status: 'NOTICE_GIVEN',
    propertyId: propertyC.id,
    landlordId: propertyC.landlordId,
    moveOutDate: null,
    currency: 'XAF',
    signedAt: isoDate(-301),
    terminatedAt: null,
    terminationReason: null,
    balanceAmount: 0,
    contractDocumentId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  leases.set(leaseC.id, leaseC);

  const depositC: MockDeposit = {
    id: nextId('deposit'),
    organizationId: DEMO_ORG_ID,
    leaseId: leaseC.id,
    tenantId: tenantA.id,
    status: 'PENDING',
    requiredAmount: requiredC,
    collectedAmount: requiredC,
    deductedAmount: 0,
    refundedAmount: 0,
    heldAmount: requiredC,
    monthsEquivalent: unitC.depositMonths ?? 2,
    dueDate: leaseC.startDate,
    fullyCollectedAt: leaseC.startDate,
    refundDueDate: null,
    refundedAt: null,
    refundBankAccountId: null,
  };
  depositC.status = computeDepositStatus(depositC);
  deposits.set(leaseC.id, depositC);

  const depositMovementC: MockDepositMovement = {
    id: nextId('depmvt'),
    organizationId: DEMO_ORG_ID,
    depositId: depositC.id,
    leaseId: leaseC.id,
    movementType: 'COLLECTION',
    amount: requiredC,
    movementDate: leaseC.startDate,
    reason: 'Encaissement du dépôt à la signature',
    currency: 'XAF',
    createdByUserId: null,
    createdAt: now,
  };
  depositMovements.set(depositMovementC.id, depositMovementC);

  const leaseCPrimary: MockLeaseParty = {
    id: nextId('leaseparty'),
    organizationId: DEMO_ORG_ID,
    leaseId: leaseC.id,
    role: 'PRIMARY_TENANT',
    tenantId: tenantA.id,
    shareBps: 10000,
    isSolidary: false,
    displayName: `${tenantA.firstName ?? ''} ${tenantA.lastName ?? ''}`.trim(),
    signedAt: leaseC.signedAt,
    createdAt: now,
  };
  leaseParties.set(leaseCPrimary.id, leaseCPrimary);
}
