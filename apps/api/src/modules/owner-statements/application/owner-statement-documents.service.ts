import { createHash } from 'node:crypto';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { formatXaf } from '../../../shared/money/amount';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { DocumentsService } from '../../documents/application/documents.service';
import { SignedLinksService } from '../../documents/application/signed-links.service';
import { NOTIFICATION_ENQUEUER, type NotificationEnqueuer } from '../../notifications/domain/ports';
import { MESSAGE_TEMPLATE_CODES } from '../../notifications/domain/template-codes';
import type { OwnerStatementDocumentModel } from '../../pdf/domain/financial-documents';
import { FinancialPdfService } from '../../pdf/application/financial-pdf.service';
import { displayNameOf, type PartyType } from '../../parties/domain/party-rules';

interface LoadedStatement {
  model: OwnerStatementDocumentModel;
  documentId: string | null;
  status: string;
  landlordId: string;
  landlordPhone: string;
  netPayableAmount: bigint;
}

/**
 * Génération PDF et envoi du relevé de gérance, calqué sur
 * `ReceiptDocumentsService` (`apps/api/src/modules/receipts/application/
 * receipt-documents.service.ts`) : rendu idempotent (un relevé qui porte
 * déjà `document_id` n'est pas re-rendu), et sans navigateur Puppeteer le
 * relevé reste `ISSUED` sans PDF plutôt que d'échouer.
 *
 * DÉCISION — canal e-mail diaspora : `NotificationDeliveryService` (module
 * `notifications`) n'implémente aujourd'hui QUE `WHATSAPP` et `SMS` (son
 * aiguillage est un simple `channel === 'WHATSAPP' ? whatsapp : sms`) —
 * ajouter `'EMAIL'` à `channelOrder` enverrait donc l'adresse mail au
 * fournisseur SMS. Tant que ce canal n'existe pas côté `notifications`, je
 * n'ajoute PAS `EMAIL` ici : c'est un écart documenté au contrat, hors
 * périmètre des deux modules qui me sont confiés.
 *
 * DÉCISION — passage à `SENT` : posé directement ici, juste après un
 * `enqueue()` réussi (pas d'écoute asynchrone de la remise effective comme
 * pour les quittances, `NOTIFICATION_OUTCOME_LISTENERS`) — le contrat
 * n'exige pas ce niveau de rigueur pour ce document, seulement que `SENT`
 * signifie « message remis ».
 */
@Injectable()
export class OwnerStatementDocumentsService {
  private readonly logger = new Logger(OwnerStatementDocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: FinancialPdfService,
    private readonly documents: DocumentsService,
    private readonly links: SignedLinksService,
    @Optional()
    @Inject(NOTIFICATION_ENQUEUER)
    private readonly enqueuer: NotificationEnqueuer | null = null,
  ) {}

  /** Génère le PDF si absent, puis envoie la notification si `notify`. */
  async generate(organizationId: string, statementId: string, notify: boolean): Promise<void> {
    const loaded = await this.loadModel(organizationId, statementId);
    if (!loaded || loaded.status === 'CANCELLED') return;

    let documentId = loaded.documentId;
    if (!documentId) {
      const rendered = await this.pdf.ownerStatement(
        loaded.model,
        `Relevé ${loaded.model.statement.number}`,
      );
      documentId = rendered.pdf
        ? await this.store(organizationId, rendered.pdf, loaded.model.statement.number, statementId)
        : null;
      await this.prisma.withTenant(organizationId, null, (tx) =>
        tx.$executeRawUnsafe(
          `UPDATE owner_statements SET document_id = coalesce(document_id, $2::uuid), updated_at = now() WHERE id = $1::uuid`,
          statementId,
          documentId,
        ),
      );
      if (!documentId) {
        this.logger.warn(
          `Relevé ${loaded.model.statement.number} émis sans PDF : aucun navigateur de rendu.`,
        );
      }
    }
    if (notify) {
      await this.send(organizationId, statementId, loaded, documentId).catch((error: Error) =>
        this.logger.warn(`Envoi du relevé ${statementId} impossible : ${error.message}`),
      );
    }
  }

  /** URL signée (10 min) du PDF, rendu à la demande au besoin (`GET /{id}/pdf`). */
  async statementPdf(
    organizationId: string,
    userId: string,
    statementId: string,
  ): Promise<{ downloadUrl: string; expiresAt: string }> {
    const before = await this.documentOf(organizationId, statementId);
    if (before) return this.documents.createDownloadUrl(organizationId, userId, before);
    await this.generate(organizationId, statementId, false);
    const after = await this.documentOf(organizationId, statementId);
    if (!after) throw new DomainError('AGENCY.STATEMENT_PDF_UNAVAILABLE', { statementId });
    return this.documents.createDownloadUrl(organizationId, userId, after);
  }

  private async documentOf(organizationId: string, statementId: string): Promise<string | null> {
    return this.prisma.withTenant(organizationId, null, async (tx) => {
      const row = await tx.owner_statements.findFirst({
        where: { id: statementId },
        select: { document_id: true },
      });
      return row?.document_id ?? null;
    });
  }

  private async send(
    organizationId: string,
    statementId: string,
    loaded: LoadedStatement,
    documentId: string | null,
  ): Promise<void> {
    if (!this.enqueuer) return;
    const pdfLink = documentId ? this.links.shortLink(organizationId, documentId) : '';
    await this.enqueuer.enqueue({
      organizationId,
      templateCode: MESSAGE_TEMPLATE_CODES.OWNER_STATEMENT_READY,
      recipient: {
        phone: loaded.landlordPhone,
        name: loaded.model.landlordName,
        landlordId: loaded.landlordId,
      },
      variables: {
        landlordName: loaded.model.landlordName,
        statementNumber: loaded.model.statement.number,
        period: loaded.model.statement.period,
        netAmount: formatXaf(loaded.netPayableAmount),
        link: pdfLink,
      },
      attachments: documentId
        ? [{ documentId, fileName: `releve-${loaded.model.statement.number}.pdf` }]
        : [],
      relatedEntity: { type: 'owner_statement', id: statementId },
      dedupeKey: `OWNER_STATEMENT_READY:${statementId}`,
      actorUserId: null,
    });
    await this.prisma.withTenant(organizationId, null, (tx) =>
      tx.$executeRawUnsafe(
        `UPDATE owner_statements
            SET status = CASE WHEN status = 'ISSUED' THEN 'SENT'::statement_status ELSE status END,
                sent_at = coalesce(sent_at, now()), updated_at = now()
          WHERE id = $1::uuid`,
        statementId,
      ),
    );
  }

  private async store(
    organizationId: string,
    pdf: Buffer,
    statementNumber: string,
    statementId: string,
  ): Promise<string> {
    const stored = await this.documents.storeGeneratedObject(organizationId, {
      kind: 'OWNER_STATEMENT_PDF',
      mimeType: 'application/pdf',
      body: pdf,
    });
    const document = await this.prisma.withTenant(organizationId, null, (tx) =>
      this.documents.registerStoredObject(tx, organizationId, null, stored, {
        kind: 'OWNER_STATEMENT_PDF',
        fileName: `releve-${statementNumber}.pdf`,
        mimeType: 'application/pdf',
        relatedEntityType: 'owner_statement',
        relatedEntityId: statementId,
        checksumSha256: createHash('sha256').update(pdf).digest('base64'),
      }),
    );
    return document.id;
  }

  private async loadModel(
    organizationId: string,
    statementId: string,
  ): Promise<LoadedStatement | null> {
    return this.prisma.withTenant(organizationId, null, async (tx) => {
      const row = await tx.owner_statements.findFirst({ where: { id: statementId } });
      if (!row) return null;

      const [landlord, property, orgRows, lines] = await Promise.all([
        tx.landlords.findFirst({
          where: { id: row.landlord_id },
          select: {
            party_type: true,
            first_name: true,
            last_name: true,
            company_name: true,
            primary_phone: true,
          },
        }),
        row.property_id
          ? tx.properties.findFirst({ where: { id: row.property_id }, select: { name: true } })
          : null,
        tx.$queryRawUnsafe<Array<Record<string, string | null>>>(
          `SELECT coalesce(trade_name, legal_name) AS name, address_line, district, city,
                  contact_phone, rccm_number
             FROM organizations WHERE id = $1::uuid`,
          organizationId,
        ),
        tx.owner_statement_lines.findMany({
          where: { statement_id: statementId },
          orderBy: { position: 'asc' },
        }),
      ]);

      const orgRow = orgRows[0] ?? {};
      const address = [orgRow.address_line, orgRow.district, orgRow.city]
        .filter(Boolean)
        .join(', ');
      const landlordName = landlord
        ? displayNameOf({
            partyType: landlord.party_type as PartyType,
            firstName: landlord.first_name,
            lastName: landlord.last_name,
            companyName: landlord.company_name,
          })
        : '';

      const model: OwnerStatementDocumentModel = {
        organization: {
          name: orgRow.name ?? '',
          address: address || null,
          phone: orgRow.contact_phone ?? null,
          rccm: orgRow.rccm_number ?? null,
        },
        landlordName,
        propertyLabel: property?.name ?? 'Portefeuille complet',
        statement: {
          number: row.statement_number,
          issueDate: toFrDate(row.issue_date),
          period: `${toFrDate(row.period_start)} – ${toFrDate(row.period_end)}`,
          rentCollectedAmount: row.rent_collected_amount,
          chargesCollectedAmount: row.charges_collected_amount,
          commissionAmount: row.commission_amount,
          commissionVatAmount: row.commission_vat_amount,
          expensesAmount: row.expenses_amount,
          carryForwardAmount: row.carry_forward_amount < 0n ? -row.carry_forward_amount : 0n,
          netPayableAmount: row.net_payable_amount,
        },
        lines: lines.map((l) => ({ label: l.label, amount: l.amount, isDebit: l.is_debit })),
      };

      return {
        model,
        documentId: row.document_id,
        status: row.status,
        landlordId: row.landlord_id,
        landlordPhone: landlord?.primary_phone ?? '',
        netPayableAmount: row.net_payable_amount,
      };
    });
  }
}

function toFrDate(value: Date): string {
  const iso = value.toISOString();
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}
