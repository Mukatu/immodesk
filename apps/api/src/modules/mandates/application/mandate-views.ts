import { toJsonAmountOrNull } from '../../../shared/money/amount';
import { displayNameOf, type PartyType } from '../../parties/domain/party-rules';
import {
  toIsoDate,
  toIsoInstant,
  type LandlordSummaryView,
} from '../../parties/application/party-views';
import type { PropertySummaryView } from '../../portfolio/application/portfolio-views';

export interface MandateRow {
  id: string;
  organization_id: string;
  landlord_id: string;
  property_id: string | null;
  reference: string;
  scope: string;
  status: string;
  start_date: Date;
  end_date: Date | null;
  notice_days: number;
  auto_renew: boolean;
  commission_basis: string;
  commission_rate_bps: number | null;
  commission_flat_amount: bigint | null;
  letting_fee_rate_bps: number | null;
  vat_rate_bps: number;
  payout_day: number;
  payout_bank_account_id: string | null;
  currency: string;
  signed_at: Date | null;
  terminated_at: Date | null;
  termination_reason: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/** `Mandate` du contrat (docs/api/phase7-contract.md, § Types). */
export interface MandateView {
  id: string;
  landlordId: string;
  propertyIds: string[];
  reference: string;
  scope: string;
  status: string;
  startDate: string;
  endDate: string | null;
  noticeDays: number;
  autoRenew: boolean;
  commissionBasis: string;
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
  currency: 'XAF';
  createdAt: string;
}

/**
 * `propertyIds` : dérivé de `property_id`, JAMAIS l'inverse (voir le
 * commentaire de tête de `mandates.service.ts`). Un mandat portefeuille
 * (`property_id IS NULL`) rend un tableau vide ici ; `MandateDetail.properties`
 * (résolu séparément, via `PROPERTY_READER`) liste alors tout le portefeuille
 * du bailleur.
 */
export function toMandateView(row: MandateRow): MandateView {
  return {
    id: row.id,
    landlordId: row.landlord_id,
    propertyIds: row.property_id ? [row.property_id] : [],
    reference: row.reference,
    scope: row.scope,
    status: row.status,
    startDate: toIsoDate(row.start_date) as string,
    endDate: toIsoDate(row.end_date),
    noticeDays: row.notice_days,
    autoRenew: row.auto_renew,
    commissionBasis: row.commission_basis,
    commissionRateBps: row.commission_rate_bps,
    commissionFlatAmount: toJsonAmountOrNull(row.commission_flat_amount),
    lettingFeeRateBps: row.letting_fee_rate_bps,
    vatRateBps: row.vat_rate_bps,
    payoutDay: row.payout_day,
    payoutBankAccountId: row.payout_bank_account_id,
    notes: row.notes,
    signedAt: toIsoInstant(row.signed_at),
    terminatedAt: toIsoInstant(row.terminated_at),
    terminationReason: row.termination_reason,
    currency: 'XAF',
    createdAt: row.created_at.toISOString(),
  };
}

export interface MandateSummaryRow extends MandateRow {
  landlord_party_type: string;
  landlord_first_name: string | null;
  landlord_last_name: string | null;
  landlord_company_name: string | null;
  landlord_country_code: string;
  properties_count: bigint | number;
}

export interface MandateSummaryView {
  id: string;
  reference: string;
  status: string;
  landlord: { id: string; displayName: string; isDiaspora: boolean };
  propertiesCount: number;
  commissionRateBps: number | null;
  startDate: string;
  endDate: string | null;
}

/** `isDiaspora` : `landlords.country_code` différent de `CG` (contrat, note en pied de § Types). */
export function toMandateSummaryView(row: MandateSummaryRow): MandateSummaryView {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    landlord: {
      id: row.landlord_id,
      displayName: displayNameOf({
        partyType: row.landlord_party_type as PartyType,
        firstName: row.landlord_first_name,
        lastName: row.landlord_last_name,
        companyName: row.landlord_company_name,
      }),
      isDiaspora: row.landlord_country_code !== 'CG',
    },
    propertiesCount: Number(row.properties_count),
    commissionRateBps: row.commission_rate_bps,
    startDate: toIsoDate(row.start_date) as string,
    endDate: toIsoDate(row.end_date),
  };
}

/** `MandateDetail.landlordPortal` (contrat, § Types) : voir `mandates-query.service.ts`. */
export interface LandlordPortalStatusView {
  invited: boolean;
  invitedAt: string | null;
  activated: boolean;
  userId: string | null;
}

/** Résumé minimal d'un relevé de gérance déjà émis pour ce mandat. */
export interface StatementSummaryForMandateRow {
  id: string;
  statement_number: string;
  status: string;
  property_id: string | null;
  property_name: string | null;
  period_start: Date;
  period_end: Date;
  rent_collected_amount: bigint;
  commission_amount: bigint;
  expenses_amount: bigint;
  carry_forward_amount: bigint;
  net_payable_amount: bigint;
  issued_at: Date | null;
  sent_at: Date | null;
  settled_at: Date | null;
}

export interface StatementSummaryView {
  id: string;
  statementNumber: string;
  status: string;
  landlord: { id: string; displayName: string };
  property: { id: string; name: string } | null;
  periodStart: string;
  periodEnd: string;
  rentCollectedAmount: number;
  commissionAmount: number;
  expensesAmount: number;
  carryForwardAmount: number;
  netPayableAmount: number;
  issuedAt: string | null;
  sentAt: string | null;
  settledAt: string | null;
}

export function toStatementSummaryView(
  row: StatementSummaryForMandateRow,
  landlord: { id: string; displayName: string },
): StatementSummaryView {
  return {
    id: row.id,
    statementNumber: row.statement_number,
    status: row.status,
    landlord,
    property: row.property_id ? { id: row.property_id, name: row.property_name ?? '' } : null,
    periodStart: toIsoDate(row.period_start) as string,
    periodEnd: toIsoDate(row.period_end) as string,
    rentCollectedAmount: toJsonAmountOrNull(row.rent_collected_amount) ?? 0,
    commissionAmount: toJsonAmountOrNull(row.commission_amount) ?? 0,
    expensesAmount: toJsonAmountOrNull(row.expenses_amount) ?? 0,
    carryForwardAmount: toJsonAmountOrNull(row.carry_forward_amount) ?? 0,
    netPayableAmount: toJsonAmountOrNull(row.net_payable_amount) ?? 0,
    issuedAt: toIsoInstant(row.issued_at),
    sentAt: toIsoInstant(row.sent_at),
    settledAt: toIsoInstant(row.settled_at),
  };
}

export interface MandateDetailView extends MandateView {
  landlord: LandlordSummaryView;
  properties: PropertySummaryView[];
  statements: StatementSummaryView[];
  landlordPortal: LandlordPortalStatusView;
}
