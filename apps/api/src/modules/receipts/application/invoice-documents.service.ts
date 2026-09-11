import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { publicInvoiceNumber, tenantDisplayName } from '../../billing/application/invoice-views';
import { frenchLongDate, periodLabel } from '../../billing/domain/period-label';
import { DocumentsService } from '../../documents/application/documents.service';
import { displayNameOf, type PartyType } from '../../parties/domain/party-rules';
import { FinancialPdfService } from '../../pdf/application/financial-pdf.service';
import {
  INVOICE_STATUS_LABELS,
  type InvoiceDocumentModel,
} from '../../pdf/domain/financial-documents';
import { renderInvoiceHtml } from '../../pdf/infrastructure/financial-renderer';
import { DocumentModelsService } from './document-models.service';

/**
 * PDF d'une facture, rendu À LA DEMANDE et mis en cache dans `documents`.
 *
 * La clé de cache est l'empreinte du HTML (montants, lignes, statut), gardée
 * dans `documents.metadata.contentHash` : une facture qui reçoit un paiement
 * change d'empreinte et produit un nouveau PDF, une facture inchangée rend le
 * document existant sans relancer Chromium.
 */
@Injectable()
export class InvoiceDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: FinancialPdfService,
    private readonly documents: DocumentsService,
    private readonly models: DocumentModelsService,
  ) {}

  async invoicePdf(
    organizationId: string,
    userId: string,
    invoiceId: string,
  ): Promise<{ downloadUrl: string; expiresAt: string }> {
    const { model, cachedId, cachedHash } = await this.prisma.withTenant(
      organizationId,
      userId,
      async (tx) => {
        const rows = await tx.$queryRawUnsafe<Array<Record<string, any>>>(
          `SELECT ri.*, t.party_type AS tenant_party_type, t.first_name AS tenant_first_name,
                t.last_name AS tenant_last_name, t.company_name AS tenant_company_name,
                t.primary_phone AS tenant_primary_phone,
                ld.party_type AS l_party_type, ld.first_name AS l_first_name, ld.last_name AS l_last_name,
                ld.company_name AS l_company_name, u.code AS unit_code, p.name AS property_name,
                concat_ws(', ', p.address_line, p.district, p.city) AS property_address,
                d.metadata ->> 'contentHash' AS cached_hash
           FROM rent_invoices ri
           JOIN tenants t ON t.id = ri.tenant_id
           JOIN landlords ld ON ld.id = ri.landlord_id
           JOIN units u ON u.id = ri.unit_id
           JOIN properties p ON p.id = ri.property_id
           LEFT JOIN documents d ON d.id = ri.document_id AND d.deleted_at IS NULL
          WHERE ri.id = $1::uuid`,
          invoiceId,
        );
        const row = rows[0];
        if (!row) throw new DomainError('BILLING.INVOICE_NOT_FOUND', { invoiceId });
        const lines = await tx.$queryRawUnsafe<
          Array<{
            label: string;
            quantity: { toString(): string };
            unit_price_amount: bigint;
            amount: bigint;
            is_credit: boolean;
          }>
        >(
          `SELECT label, quantity, unit_price_amount, amount, is_credit FROM invoice_lines
          WHERE invoice_id = $1::uuid ORDER BY position, created_at`,
          invoiceId,
        );
        const organization = await this.models.organization(tx, organizationId);
        const model: InvoiceDocumentModel = {
          organization,
          landlordName: displayNameOf({
            partyType: row.l_party_type as PartyType,
            firstName: row.l_first_name,
            lastName: row.l_last_name,
            companyName: row.l_company_name,
          }),
          tenantName: tenantDisplayName(row as never),
          tenantPhone: row.tenant_primary_phone,
          unitCode: row.unit_code,
          propertyName: row.property_name,
          propertyAddress: row.property_address,
          invoice: {
            number: publicInvoiceNumber(row.invoice_number) ?? 'Brouillon',
            statusLabel: INVOICE_STATUS_LABELS[row.status] ?? row.status,
            issueDate: frenchLongDate(row.issue_date),
            dueDate: frenchLongDate(row.due_date),
            period: periodLabel(row.period_start, row.period_end),
            totalAmount: row.total_amount,
            paidAmount: row.paid_amount,
            balanceAmount: row.balance_amount,
            discountAmount: row.discount_amount,
          },
          lines: lines.map((l) => ({
            label: l.label,
            quantity: String(Number(l.quantity.toString())),
            unitPrice: l.unit_price_amount,
            amount: l.amount,
            isCredit: l.is_credit,
          })),
        };
        return {
          model,
          cachedId: row.document_id as string | null,
          cachedHash: row.cached_hash as string | null,
        };
      },
    );

    const contentHash = renderInvoiceHtml(model).contentHash;
    if (cachedId && cachedHash === contentHash) {
      return this.documents.createDownloadUrl(organizationId, userId, cachedId);
    }
    const rendered = await this.pdf.invoice(model, `Facture ${model.invoice.number}`);
    if (!rendered.pdf) throw new DomainError('BILLING.PDF_UNAVAILABLE');
    const pdfBytes = rendered.pdf;
    const stored = await this.documents.storeGeneratedObject(organizationId, {
      kind: 'INVOICE_PDF',
      mimeType: 'application/pdf',
      body: pdfBytes,
    });
    const documentId = await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const document = await this.documents.registerStoredObject(
        tx,
        organizationId,
        userId,
        stored,
        {
          kind: 'INVOICE_PDF',
          fileName: `facture-${model.invoice.number}.pdf`,
          mimeType: 'application/pdf',
          relatedEntityType: 'rent_invoice',
          relatedEntityId: invoiceId,
        },
        { contentHash },
      );
      await tx.$executeRawUnsafe(
        `UPDATE rent_invoices SET document_id = $2::uuid WHERE id = $1::uuid`,
        invoiceId,
        document.id,
      );
      return document.id;
    });
    return this.documents.createDownloadUrl(organizationId, userId, documentId);
  }
}
