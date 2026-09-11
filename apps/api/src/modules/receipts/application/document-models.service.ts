import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import { frenchLongDate, periodLabel } from '../../billing/domain/period-label';
import { displayNameOf, type PartyType } from '../../parties/domain/party-rules';
import {
  PAYMENT_METHOD_LABELS,
  type CashReceiptDocumentModel,
  type OrganizationBlock,
  type ReceiptDocumentModel,
} from '../../pdf/domain/financial-documents';

type Named = {
  party_type: string | null;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
};

function nameOf(prefix: string, row: Record<string, unknown>): string {
  const pick = (k: string) => (row[`${prefix}_${k}`] as string | null) ?? null;
  const named: Named = {
    party_type: pick('party_type'),
    first_name: pick('first_name'),
    last_name: pick('last_name'),
    company_name: pick('company_name'),
  };
  return displayNameOf({
    partyType: (named.party_type ?? 'INDIVIDUAL') as PartyType,
    firstName: named.first_name,
    lastName: named.last_name,
    companyName: named.company_name,
  });
}

const PARTY_COLUMNS = (alias: string, prefix: string) =>
  `${alias}.party_type AS ${prefix}_party_type, ${alias}.first_name AS ${prefix}_first_name, ` +
  `${alias}.last_name AS ${prefix}_last_name, ${alias}.company_name AS ${prefix}_company_name`;

export interface LoadedReceipt {
  model: Omit<ReceiptDocumentModel, 'qrDataUrl'>;
  status: string;
  documentId: string | null;
  verificationUrl: string;
  receiptNumber: string;
  tenantId: string;
  tenantPhone: string;
  totalAmount: bigint;
  organizationName: string;
}

/**
 * Assemble les données imprimées sur les documents financiers, dans la
 * transaction de l'appelant. Lectures seules, par jointures : aucune écriture
 * hors du module propriétaire.
 */
@Injectable()
export class DocumentModelsService {
  constructor(private readonly config: AppConfigService) {}

  async organization(
    tx: TenantClient,
    organizationId: string,
  ): Promise<OrganizationBlock & { type: string }> {
    const rows = await tx.$queryRawUnsafe<Array<Record<string, string | null>>>(
      `SELECT type::text AS type, coalesce(trade_name, legal_name) AS name, address_line, district, city,
              contact_phone, rccm_number
         FROM organizations WHERE id = $1::uuid`,
      organizationId,
    );
    const row = rows[0] ?? {};
    const address = [row.address_line, row.district, row.city].filter(Boolean).join(', ');
    return {
      type: row.type ?? 'AGENCY',
      name: row.name ?? '',
      address: address || null,
      phone: row.contact_phone ?? null,
      rccm: row.rccm_number ?? null,
    };
  }

  async receipt(
    tx: TenantClient,
    organizationId: string,
    receiptId: string,
  ): Promise<LoadedReceipt | null> {
    const rows = await tx.$queryRawUnsafe<Array<Record<string, any>>>(
      `SELECT r.*, ${PARTY_COLUMNS('t', 't')}, t.primary_phone AS tenant_phone,
              ${PARTY_COLUMNS('ld', 'l')}, ld.is_self AS landlord_is_self,
              u.code AS unit_code, p.name AS property_name,
              concat_ws(', ', p.address_line, p.district, p.city) AS property_address,
              pm.method::text AS payment_method, pm.reference AS payment_reference,
              pm.external_reference AS payment_external_reference,
              (SELECT cr.receipt_number FROM cash_receipts cr WHERE cr.payment_id = r.payment_id LIMIT 1) AS cash_number
         FROM receipts r
         JOIN tenants t ON t.id = r.tenant_id
         JOIN payments pm ON pm.id = r.payment_id
         LEFT JOIN landlords ld ON ld.id = r.landlord_id
         LEFT JOIN units u ON u.id = r.unit_id
         LEFT JOIN properties p ON p.id = u.property_id
        WHERE r.id = $1::uuid`,
      receiptId,
    );
    const row = rows[0];
    if (!row) return null;
    const organization = await this.organization(tx, organizationId);
    const landlordName = row.landlord_id ? nameOf('l', row) : organization.name;
    const period =
      row.period_start && row.period_end ? periodLabel(row.period_start, row.period_end) : '';
    return {
      status: row.status,
      documentId: row.document_id,
      verificationUrl: row.verification_url,
      receiptNumber: row.receipt_number,
      tenantId: row.tenant_id,
      tenantPhone: row.tenant_phone,
      totalAmount: row.total_amount,
      organizationName: organization.name,
      model: {
        pageSize: this.config.get('RECEIPT_PDF_FORMAT'),
        organization,
        landlordName,
        agencyManaged: !row.landlord_is_self,
        tenantName: nameOf('t', row),
        unitCode: row.unit_code ?? '',
        propertyName: row.property_name ?? '',
        propertyAddress: row.property_address ?? '',
        receipt: {
          number: row.receipt_number,
          issueDate: frenchLongDate(row.issue_date),
          period,
          rentAmount: row.rent_amount,
          chargesAmount: row.charges_amount,
          penaltyAmount: row.penalty_amount,
          totalAmount: row.total_amount,
          remainingBalance: row.remaining_balance_amount,
          verificationUrl: row.verification_url,
          contentHashShort: String(row.content_hash ?? '').slice(0, 16),
          cancelled: row.status === 'CANCELLED',
        },
        payment: {
          methodLabel: PAYMENT_METHOD_LABELS[row.payment_method] ?? row.payment_method,
          reference: row.payment_reference,
          externalReference: row.payment_external_reference,
          cashReceiptNumber: row.cash_number,
        },
      },
    };
  }

  async cashReceipt(
    tx: TenantClient,
    organizationId: string,
    cashReceiptId: string,
  ): Promise<{
    model: CashReceiptDocumentModel;
    row: Record<string, any>;
    organizationName: string;
  } | null> {
    const rows = await tx.$queryRawUnsafe<Array<Record<string, any>>>(
      `SELECT cr.*, ${PARTY_COLUMNS('t', 't')}, t.primary_phone AS tenant_phone, pm.reference AS payment_reference,
              coalesce(u.display_name, nullif(concat_ws(' ', u.first_name, u.last_name), ''), u.phone_e164) AS collector_name,
              (SELECT coalesce(sum(pa.amount), 0) FROM payment_allocations pa
                WHERE pa.payment_id = cr.payment_id AND pa.tenant_credit_id IS NOT NULL AND NOT pa.is_reversal)::bigint AS credit_amount
         FROM cash_receipts cr
         JOIN tenants t ON t.id = cr.tenant_id
         JOIN users u ON u.id = cr.collector_user_id
         LEFT JOIN payments pm ON pm.id = cr.payment_id
        WHERE cr.id = $1::uuid`,
      cashReceiptId,
    );
    const row = rows[0];
    if (!row) return null;
    const allocations = row.payment_id
      ? await tx.$queryRawUnsafe<
          Array<{ invoice_number: string; period_start: Date; period_end: Date; amount: bigint }>
        >(
          `SELECT ri.invoice_number, ri.period_start, ri.period_end, pa.amount
             FROM payment_allocations pa JOIN rent_invoices ri ON ri.id = pa.invoice_id
            WHERE pa.payment_id = $1::uuid AND NOT pa.is_reversal ORDER BY pa.allocation_order`,
          row.payment_id,
        )
      : [];
    const organization = await this.organization(tx, organizationId);
    return {
      row,
      organizationName: organization.name,
      model: {
        pageSize: this.config.get('RECEIPT_PDF_FORMAT'),
        organization,
        tenantName: nameOf('t', row),
        payerName: row.payer_name,
        collectorName: row.collector_name ?? '',
        receipt: {
          number: row.receipt_number,
          receivedAt: `${frenchLongDate(row.received_at)} à ${row.received_at.toISOString().slice(11, 16)} UTC`,
          amount: row.amount,
          purpose: row.purpose,
          signatureHashShort: row.signature_hash ? String(row.signature_hash).slice(0, 16) : null,
          paymentReference: row.payment_reference ?? '',
          cancelled: row.status === 'CANCELLED',
        },
        allocations: allocations.map((a) => ({
          invoiceNumber: a.invoice_number,
          period: periodLabel(a.period_start, a.period_end),
          amount: a.amount,
        })),
        creditAmount: row.credit_amount ?? 0n,
      },
    };
  }
}
