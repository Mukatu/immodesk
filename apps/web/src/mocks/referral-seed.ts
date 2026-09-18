/**
 * Mock MSW — Phase 10, apport d'affaires (parrainage), état en mémoire et
 * seed de démonstration, conforme à docs/api/phase10-contract.md section
 * « Apport d'affaires » et arbitrages n°5 à 7. Suit le principe des seeds de
 * phases précédentes : Maps exportées, seed appelée séparément (voir compte
 * rendu — point d'intégration dans handlers.ts non fait ici).
 */
import { findOrCreateUser } from './handlers';
import type { MomoProviderMock } from './payments-phase4-seed';

export type ReferralPartnerStatusMock = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
export type ReferralStatusMock = 'PENDING' | 'QUALIFIED' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type ReferralCommissionStatusMock =
  'ACCRUED' | 'APPROVED' | 'PAID' | 'REVERSED' | 'CANCELLED';
export type ReferralSourceMock =
  'CODE_AT_SIGNUP' | 'PARTNER_REGISTERED_PROPERTY' | 'LINK' | 'MANUAL_ADMIN';
export type ReferralPayoutStatusMock =
  'PENDING' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED';

export interface MockReferralPartner {
  id: string;
  userId: string;
  displayName: string;
  phone: string;
  code: string;
  status: ReferralPartnerStatusMock;
  momoProvider: MomoProviderMock | null;
  payoutMsisdn: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

/**
 * `referredOrganizationName` est stocké en clair (comme le ferait une
 * dénormalisation en base) : aucune organisation réelle n'a besoin d'exister
 * dans la Map `organizations` de handlers.ts pour qu'un parrainage de
 * démonstration soit affichable — le contrat ne l'exige pas non plus (une
 * campagne de démonstration côté partenaire n'a pas de compte agence associé).
 */
export interface MockReferral {
  id: string;
  partnerId: string;
  referredOrganizationId: string;
  referredOrganizationName: string;
  source: ReferralSourceMock;
  status: ReferralStatusMock;
  qualifiedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface MockReferralCommission {
  id: string;
  partnerId: string;
  referralId: string;
  subscriptionInvoiceId: string;
  amount: number;
  rateBps: number;
  status: ReferralCommissionStatusMock;
  reversalOfId: string | null;
  payoutId: string | null;
  accruedAt: string;
  approvedAt: string | null;
  paidAt: string | null;
}

export interface MockReferralPayout {
  id: string;
  partnerId: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  status: ReferralPayoutStatusMock;
  commissionsCount: number;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
}

/** File d'attente OTP (arbitrage `referrals_otp_chk`) : aucun Referral tant que non confirmée. */
export interface MockReferralPropertyRegistration {
  id: string;
  partnerId: string;
  landlordPhone: string;
  propertyName: string;
  propertyAddressLine: string;
  propertyCity: string;
  confirmedAt: string | null;
  createdAt: string;
}

export interface MockAtRiskSubscription {
  organizationId: string;
  organizationName: string;
  status: 'PAST_DUE' | 'SUSPENDED';
  planCode: string;
  currentPeriodEnd: string;
  overdueInvoicesCount: number;
  overdueAmount: number;
  daysPastDue: number;
}

export const referralPartners = new Map<string, MockReferralPartner>();
export const referrals = new Map<string, MockReferral>();
export const referralCommissions = new Map<string, MockReferralCommission>();
export const referralPayouts = new Map<string, MockReferralPayout>();
export const referralPropertyRegistrations = new Map<string, MockReferralPropertyRegistration>();
/** Clé = organizationId : une entrée par organisation en difficulté. */
export const atRiskSubscriptions = new Map<string, MockAtRiskSubscription>();

const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** `IMD-` + six caractères alphanumériques majuscules, garanti unique (contrat, section « Devenir partenaire »). */
export function generateReferralCode(): string {
  let code: string;
  do {
    let suffix = '';
    for (let i = 0; i < 6; i += 1) {
      suffix += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    code = `IMD-${suffix}`;
  } while ([...referralPartners.values()].some((p) => p.code === code));
  return code;
}

export function findPartnerByUserId(userId: string): MockReferralPartner | undefined {
  return [...referralPartners.values()].find((p) => p.userId === userId);
}

/**
 * Point d'extension pour une tranche ultérieure (facturation d'abonnement,
 * arbitrage n°6) : à appeler quand une `subscription_invoice` de
 * `organizationId` passe réellement à PAID — jamais à l'inscription. Simplifié
 * ici en une seule transition PENDING -> ACTIVE (le contrat décrit PENDING ->
 * QUALIFIED -> ACTIVE comme déclenchées par le même événement) ; `qualifiedAt`
 * est posé une seule fois, jamais réécrit. N'est appelée nulle part dans ce
 * lot : aucun paiement d'abonnement n'est simulé ici (hors périmètre).
 */
export function qualifyReferralsForOrganization(organizationId: string): void {
  const now = new Date().toISOString();
  for (const referral of referrals.values()) {
    if (referral.referredOrganizationId === organizationId && referral.status === 'PENDING') {
      referral.status = 'ACTIVE';
      referral.qualifiedAt = referral.qualifiedAt ?? now;
    }
  }
}

export interface SeedReferralDeps {
  DEMO_ORG_ID: string;
  nextId: (prefix: string) => string;
}

/**
 * Un partenaire ACTIVE avec des commissions aux trois statuts pertinents
 * (ACCRUED/APPROVED/PAID) et un versement PAID les regroupant — jeu de
 * données de démonstration cohérent, sans logique de calcul (contrat non
 * exigé pour ce lot). Idempotent (téléphone dédié).
 */
export function seedReferralDemoData(deps: SeedReferralDeps): void {
  const { nextId } = deps;
  const DEMO_PARTNER_PHONE = '+242066000900';
  if ([...referralPartners.values()].some((p) => p.phone === DEMO_PARTNER_PHONE)) return;

  const user = findOrCreateUser(DEMO_PARTNER_PHONE);
  const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

  const partnerId = nextId('refpartner');
  referralPartners.set(partnerId, {
    id: partnerId,
    userId: user.id,
    displayName: 'Jeanne Referral — apporteuse de démonstration',
    phone: DEMO_PARTNER_PHONE,
    code: generateReferralCode(),
    status: 'ACTIVE',
    momoProvider: 'MTN_MOMO',
    payoutMsisdn: DEMO_PARTNER_PHONE,
    verifiedAt: daysAgo(60),
    createdAt: daysAgo(75),
  });

  const referralId = nextId('referral');
  referrals.set(referralId, {
    id: referralId,
    partnerId,
    referredOrganizationId: 'org-demo-referred-1',
    referredOrganizationName: 'Agence Malanga Immo',
    source: 'CODE_AT_SIGNUP',
    status: 'ACTIVE',
    qualifiedAt: daysAgo(58),
    expiresAt: null,
    createdAt: daysAgo(60),
  });

  const RATE_BPS = 1000; // 10%, taux de démonstration (pas de programme référencé dans ce lot)
  const payoutId = nextId('refpayout');
  const commissionAccruedId = nextId('refcommission');
  const commissionApprovedId = nextId('refcommission');
  const commissionPaidId = nextId('refcommission');

  referralCommissions.set(commissionAccruedId, {
    id: commissionAccruedId,
    partnerId,
    referralId,
    subscriptionInvoiceId: nextId('subinvoice'),
    amount: 4_500,
    rateBps: RATE_BPS,
    status: 'ACCRUED',
    reversalOfId: null,
    payoutId: null,
    accruedAt: daysAgo(5),
    approvedAt: null,
    paidAt: null,
  });
  referralCommissions.set(commissionApprovedId, {
    id: commissionApprovedId,
    partnerId,
    referralId,
    subscriptionInvoiceId: nextId('subinvoice'),
    amount: 4_500,
    rateBps: RATE_BPS,
    status: 'APPROVED',
    reversalOfId: null,
    payoutId: null,
    accruedAt: daysAgo(35),
    approvedAt: daysAgo(28),
    paidAt: null,
  });
  referralCommissions.set(commissionPaidId, {
    id: commissionPaidId,
    partnerId,
    referralId,
    subscriptionInvoiceId: nextId('subinvoice'),
    amount: 4_500,
    rateBps: RATE_BPS,
    status: 'PAID',
    reversalOfId: null,
    payoutId,
    accruedAt: daysAgo(58),
    approvedAt: daysAgo(50),
    paidAt: daysAgo(45),
  });

  referralPayouts.set(payoutId, {
    id: payoutId,
    partnerId,
    periodStart: daysAgo(60).slice(0, 10),
    periodEnd: daysAgo(46).slice(0, 10),
    amount: 4_500,
    status: 'PAID',
    commissionsCount: 1,
    failureReason: null,
    paidAt: daysAgo(45),
    createdAt: daysAgo(46),
  });

  // ---- Abonnements à risque (back-office plateforme) ----
  atRiskSubscriptions.set(deps.DEMO_ORG_ID, {
    organizationId: deps.DEMO_ORG_ID,
    organizationName: 'Résidence Mpila (démonstration)',
    status: 'PAST_DUE',
    planCode: 'IMD-STD',
    currentPeriodEnd: daysAgo(-5).slice(0, 10),
    overdueInvoicesCount: 1,
    overdueAmount: 25_000,
    daysPastDue: 9,
  });
  const secondRiskOrgId = 'org-demo-risk-2';
  atRiskSubscriptions.set(secondRiskOrgId, {
    organizationId: secondRiskOrgId,
    organizationName: 'Gérance Poto-Poto',
    status: 'SUSPENDED',
    planCode: 'IMD-STD',
    currentPeriodEnd: daysAgo(20).slice(0, 10),
    overdueInvoicesCount: 3,
    overdueAmount: 75_000,
    daysPastDue: 27,
  });
}
