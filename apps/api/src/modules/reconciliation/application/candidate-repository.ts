import { Injectable } from '@nestjs/common';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import { normalizeLabel } from '../../bank-statements/domain/label-normalization';
import { publicInvoiceNumber } from '../../billing/application/invoice-views';
import type { MatchTargetType } from '../domain/match-target';

/**
 * Candidat au rapprochement d'une ligne, restreint EN BASE par le montant et
 * une fenêtre de dates (docs/api/phase6-contract.md § 5 : « pas d'extension
 * `pg_trgm` », similarité calculée en application sur un ensemble restreint).
 * Le libellé n'intervient JAMAIS dans le `WHERE`.
 */
export interface Candidate {
  targetType: MatchTargetType;
  targetId: string;
  amount: bigint;
  date: Date;
  label: string;
  normalizedLabel: string;
  tenant: { id: string; displayName: string } | null;
  invoice: { id: string; invoiceNumber: string | null } | null;
}

interface CandidateSqlRow {
  target_id: string;
  amount: bigint;
  date: Date;
  label: string;
  tenant_id: string | null;
  tenant_display_name: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
}

const CANDIDATE_LIMIT = 50;

/**
 * Nom affiché d'un tiers `tenants` en SQL, jumeau de `displayNameOf`
 * (`parties/domain/party-rules.ts`) : raison sociale pour une personne
 * morale (`COMPANY`), prénom + nom sinon.
 */
const TENANT_DISPLAY_NAME_SQL = `CASE WHEN t.party_type = 'COMPANY'
  THEN coalesce(t.company_name, t.last_name)
  ELSE nullif(concat_ws(' ', t.first_name, t.last_name), '') END`;

@Injectable()
export class CandidateRepository {
  /**
   * Candidats des quatre types de cible pour une ligne CREDIT, chacun borné
   * par `[amount * (1 - amountTolerancePercent/100), amount]` (entiers XAF)
   * et par la fenêtre de dates `dateWindowDays`, `LIMIT 50` par type, triés
   * par proximité de montant puis de date (contrat § « Moteur de
   * rapprochement », restriction des candidats).
   */
  async findCandidates(
    tx: TenantClient,
    input: {
      organizationId: string;
      lineAmount: bigint;
      operationDate: Date;
      dateWindowDays: number;
      amountTolerancePercent: number;
    },
  ): Promise<Candidate[]> {
    const minAmount = this.minAmount(input.lineAmount, input.amountTolerancePercent);
    const dateLow = this.shiftDays(input.operationDate, -input.dateWindowDays);
    const dateHigh = this.shiftDays(input.operationDate, input.dateWindowDays);
    const params = [
      input.organizationId,
      minAmount,
      input.lineAmount,
      dateLow,
      dateHigh,
      input.operationDate,
    ];

    const [payments, declarations, checks, remittances] = await Promise.all([
      tx.$queryRawUnsafe<CandidateSqlRow[]>(this.paymentSql(), ...params),
      tx.$queryRawUnsafe<CandidateSqlRow[]>(this.declarationSql(), ...params),
      tx.$queryRawUnsafe<CandidateSqlRow[]>(this.checkSql(), ...params),
      tx.$queryRawUnsafe<CandidateSqlRow[]>(this.remittanceSql(), ...params),
    ]);

    return [
      ...payments.map((r) => this.toCandidate(r, 'PAYMENT')),
      ...declarations.map((r) => this.toCandidate(r, 'DECLARATION')),
      ...checks.map((r) => this.toCandidate(r, 'CHECK')),
      ...remittances.map((r) => this.toCandidate(r, 'REMITTANCE')),
    ];
  }

  private toCandidate(row: CandidateSqlRow, targetType: MatchTargetType): Candidate {
    return {
      targetType,
      targetId: row.target_id,
      amount: row.amount,
      date: row.date,
      label: row.label ?? '',
      normalizedLabel: normalizeLabel(row.label ?? ''),
      tenant: row.tenant_id
        ? { id: row.tenant_id, displayName: row.tenant_display_name ?? '' }
        : null,
      invoice: row.invoice_id
        ? {
            id: row.invoice_id,
            invoiceNumber: row.invoice_number ? publicInvoiceNumber(row.invoice_number) : null,
          }
        : null,
    };
  }

  private minAmount(lineAmount: bigint, amountTolerancePercent: number): bigint {
    const fraction = Math.max(0, Math.min(100, amountTolerancePercent)) / 100;
    const min = Number(lineAmount) * (1 - fraction);
    return BigInt(Math.max(0, Math.floor(min)));
  }

  private shiftDays(date: Date, days: number): Date {
    const shifted = new Date(date.getTime());
    shifted.setUTCDate(shifted.getUTCDate() + days);
    return shifted;
  }

  // --- payments : PENDING_VERIFICATION, imputé (ou non) à une facture ------
  private paymentSql(): string {
    return `
      SELECT p.id AS target_id, p.amount, p.payment_date AS date,
             coalesce(${TENANT_DISPLAY_NAME_SQL}, p.external_reference, '') AS label,
             p.tenant_id, ${TENANT_DISPLAY_NAME_SQL} AS tenant_display_name,
             inv.id AS invoice_id, inv.invoice_number AS invoice_number
        FROM payments p
        LEFT JOIN tenants t ON t.id = p.tenant_id
        LEFT JOIN LATERAL (
          SELECT ri.id, ri.invoice_number FROM payment_allocations pa
            JOIN rent_invoices ri ON ri.id = pa.invoice_id
           WHERE pa.payment_id = p.id AND NOT pa.is_reversal
           ORDER BY pa.created_at ASC LIMIT 1
        ) inv ON true
       WHERE p.organization_id = $1::uuid AND p.status = 'PENDING_VERIFICATION'
         AND p.amount BETWEEN $2::bigint AND $3::bigint
         AND p.payment_date BETWEEN $4::date AND $5::date
       ORDER BY abs(p.amount - $3::bigint), abs(p.payment_date - $6::date)
       LIMIT ${CANDIDATE_LIMIT}`;
  }

  // --- déclarations de virement : SUBMITTED ou UNDER_REVIEW ----------------
  private declarationSql(): string {
    return `
      SELECT d.id AS target_id, d.declared_amount AS amount, d.transfer_date AS date,
             d.payer_name AS label,
             d.tenant_id, ${TENANT_DISPLAY_NAME_SQL} AS tenant_display_name,
             d.invoice_id AS invoice_id, ri.invoice_number AS invoice_number
        FROM bank_transfer_declarations d
        LEFT JOIN tenants t ON t.id = d.tenant_id
        LEFT JOIN rent_invoices ri ON ri.id = d.invoice_id
       WHERE d.organization_id = $1::uuid AND d.status IN ('SUBMITTED', 'UNDER_REVIEW')
         AND d.declared_amount BETWEEN $2::bigint AND $3::bigint
         AND d.transfer_date BETWEEN $4::date AND $5::date
       ORDER BY abs(d.declared_amount - $3::bigint), abs(d.transfer_date - $6::date)
       LIMIT ${CANDIDATE_LIMIT}`;
  }

  // --- chèques déposés : DEPOSITED ------------------------------------------
  private checkSql(): string {
    return `
      SELECT c.id AS target_id, c.amount, coalesce(c.deposit_date, c.issue_date) AS date,
             c.drawer_name AS label,
             c.tenant_id, ${TENANT_DISPLAY_NAME_SQL} AS tenant_display_name,
             inv.id AS invoice_id, inv.invoice_number AS invoice_number
        FROM bank_checks c
        LEFT JOIN tenants t ON t.id = c.tenant_id
        LEFT JOIN LATERAL (
          SELECT ri.id, ri.invoice_number FROM payment_allocations pa
            JOIN rent_invoices ri ON ri.id = pa.invoice_id
           WHERE pa.payment_id = c.payment_id AND NOT pa.is_reversal
           ORDER BY pa.created_at ASC LIMIT 1
        ) inv ON true
       WHERE c.organization_id = $1::uuid AND c.status = 'DEPOSITED'
         AND c.amount BETWEEN $2::bigint AND $3::bigint
         AND coalesce(c.deposit_date, c.issue_date) BETWEEN $4::date AND $5::date
       ORDER BY abs(c.amount - $3::bigint), abs(coalesce(c.deposit_date, c.issue_date) - $6::date)
       LIMIT ${CANDIDATE_LIMIT}`;
  }

  // --- remises d'espèces vérifiées, avant dépôt : VERIFIED ------------------
  private remittanceSql(): string {
    return `
      SELECT r.id AS target_id, r.counted_amount AS amount, r.verified_at::date AS date,
             coalesce(u.display_name, nullif(concat_ws(' ', u.first_name, u.last_name), ''), u.phone_e164) AS label,
             NULL::uuid AS tenant_id, NULL::text AS tenant_display_name,
             NULL::uuid AS invoice_id, NULL::text AS invoice_number
        FROM cash_remittances r
        JOIN users u ON u.id = r.collector_user_id
       WHERE r.organization_id = $1::uuid AND r.status = 'VERIFIED'
         AND r.counted_amount BETWEEN $2::bigint AND $3::bigint
         AND r.verified_at::date BETWEEN $4::date AND $5::date
       ORDER BY abs(r.counted_amount - $3::bigint), abs(r.verified_at::date - $6::date)
       LIMIT ${CANDIDATE_LIMIT}`;
  }
}
