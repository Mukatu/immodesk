import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DomainError } from '../../../shared/errors/domain-error';
import { formatXaf } from '../../../shared/money/amount';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { DocumentsService } from '../../documents/application/documents.service';
import { SignedLinksService } from '../../documents/application/signed-links.service';
import type { DocumentKind } from '../../documents/domain/document-rules';
import {
  NOTIFICATION_ENQUEUER,
  type NotificationChannel,
  type NotificationEnqueuer,
} from '../../notifications/domain/ports';
import { MESSAGE_TEMPLATE_CODES } from '../../notifications/domain/template-codes';
import { FinancialPdfService } from '../../pdf/application/financial-pdf.service';
import { DocumentModelsService } from './document-models.service';

export interface SendOptions {
  channel?: NotificationChannel;
  /** Envoi demandé par un gestionnaire : jamais dédoublonné, 409 si la pièce n'est pas émise. */
  manual: boolean;
  actorUserId?: string | null;
}

/**
 * Production et envoi des quittances et reçus de caisse.
 *
 * Le rendu est IDEMPOTENT : une pièce qui porte déjà son `document_id` n'est
 * pas re-rendue, et le numéro n'est jamais réattribué. Sans navigateur, la
 * quittance passe tout de même ISSUED (sans PDF) et part avec son lien de
 * vérification : le locataire n'attend pas un Chromium.
 */
@Injectable()
export class ReceiptDocumentsService {
  private readonly logger = new Logger(ReceiptDocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: FinancialPdfService,
    private readonly documents: DocumentsService,
    private readonly models: DocumentModelsService,
    private readonly links: SignedLinksService,
    private readonly auditService: AuditService,
    @Optional()
    @Inject(NOTIFICATION_ENQUEUER)
    private readonly enqueuer: NotificationEnqueuer | null = null,
  ) {}

  async generateReceipt(organizationId: string, receiptId: string, notify: boolean): Promise<void> {
    const loaded = await this.prisma.withTenant(organizationId, null, (tx) =>
      this.models.receipt(tx, organizationId, receiptId),
    );
    if (!loaded || loaded.status === 'CANCELLED') return;
    if (!loaded.documentId) {
      const rendered = await this.pdf.receipt(
        { ...loaded.model, qrDataUrl: await this.pdf.qr(loaded.verificationUrl) },
        `Quittance ${loaded.receiptNumber}`,
      );
      const documentId = rendered.pdf
        ? await this.store(
            organizationId,
            'RECEIPT_PDF',
            rendered.pdf,
            `quittance-${loaded.receiptNumber}.pdf`,
            'receipt',
            receiptId,
          )
        : null;
      await this.prisma.withTenant(organizationId, null, async (tx) => {
        const rows = await tx.$queryRawUnsafe<Array<{ id: string; previous: string }>>(
          `WITH target AS (SELECT id, status::text AS previous FROM receipts WHERE id = $1::uuid FOR UPDATE)
           UPDATE receipts r
              SET status = CASE WHEN r.status = 'GENERATING' THEN 'ISSUED'::receipt_status ELSE r.status END,
                  document_id = coalesce(r.document_id, $2::uuid),
                  generated_at = coalesce(r.generated_at, now()),
                  generated_by_job = coalesce(r.generated_by_job, $3), updated_at = now()
             FROM target WHERE r.id = target.id AND r.status <> 'CANCELLED'
           RETURNING r.id, target.previous`,
          receiptId,
          documentId,
          `financial-documents:${receiptId}`,
        );
        if (rows[0]?.previous === 'GENERATING') {
          await audit(this.auditService, tx, {
            organizationId,
            actorLabel: 'worker.financial-documents',
            action: 'STATE_TRANSITION',
            operation: AUDIT_OPERATIONS.RECEIPT_ISSUED,
            entityType: 'receipts',
            entityId: receiptId,
            previousState: toJsonState({ status: 'GENERATING' }),
            newState: toJsonState({ status: 'ISSUED', documentId, pdf: Boolean(documentId) }),
          });
        }
      });
      if (!documentId)
        this.logger.warn(
          `Quittance ${loaded.receiptNumber} émise sans PDF : aucun navigateur de rendu.`,
        );
    }
    if (notify) {
      await this.sendReceipt(organizationId, receiptId, { manual: false }).catch((error: Error) =>
        this.logger.warn(`Envoi de la quittance ${receiptId} impossible : ${error.message}`),
      );
    }
  }

  async sendReceipt(
    organizationId: string,
    receiptId: string,
    options: SendOptions,
  ): Promise<{ notificationId: string } | null> {
    const loaded = await this.prisma.withTenant(organizationId, options.actorUserId ?? null, (tx) =>
      this.models.receipt(tx, organizationId, receiptId),
    );
    if (!loaded) throw new DomainError('RECEIPTS.NOT_FOUND', { receiptId });
    if (loaded.status !== 'ISSUED' && loaded.status !== 'SENT') {
      if (options.manual) throw new DomainError('RECEIPTS.NOT_SENDABLE', { status: loaded.status });
      return null;
    }
    const result = await this.requireEnqueuer().enqueue({
      organizationId,
      templateCode: MESSAGE_TEMPLATE_CODES.RECEIPT_ISSUED,
      channelOrder: options.channel ? [options.channel] : undefined,
      recipient: {
        phone: loaded.tenantPhone,
        name: loaded.model.tenantName,
        tenantId: loaded.tenantId,
      },
      variables: {
        tenantName: loaded.model.tenantName,
        amount: formatXaf(loaded.totalAmount),
        period: loaded.model.receipt.period,
        receiptNumber: loaded.receiptNumber,
        link: loaded.verificationUrl,
        pdfLink: loaded.documentId ? this.links.shortLink(organizationId, loaded.documentId) : '',
        organizationName: loaded.organizationName,
      },
      attachments: loaded.documentId
        ? [{ documentId: loaded.documentId, fileName: `quittance-${loaded.receiptNumber}.pdf` }]
        : [],
      relatedEntity: { type: 'receipt', id: receiptId },
      dedupeKey: options.manual ? null : `RECEIPT_ISSUED:${receiptId}`,
      actorUserId: options.actorUserId ?? null,
    });
    return { notificationId: result.notificationId };
  }

  async generateCashReceipt(
    organizationId: string,
    cashReceiptId: string,
    notify: boolean,
  ): Promise<void> {
    const loaded = await this.prisma.withTenant(organizationId, null, (tx) =>
      this.models.cashReceipt(tx, organizationId, cashReceiptId),
    );
    if (!loaded) return;
    if (!loaded.row.document_id) {
      const rendered = await this.pdf.cashReceipt(
        loaded.model,
        `Reçu ${loaded.row.receipt_number}`,
      );
      if (rendered.pdf) {
        const documentId = await this.store(
          organizationId,
          'CASH_RECEIPT_PDF',
          rendered.pdf,
          `recu-${loaded.row.receipt_number}.pdf`,
          'cash_receipt',
          cashReceiptId,
        );
        await this.prisma.withTenant(organizationId, null, (tx) =>
          tx.$executeRawUnsafe(
            `UPDATE cash_receipts SET document_id = coalesce(document_id, $2::uuid), updated_at = now() WHERE id = $1::uuid`,
            cashReceiptId,
            documentId,
          ),
        );
      }
    }
    if (notify && loaded.row.status !== 'CANCELLED') {
      await this.sendCashReceipt(organizationId, cashReceiptId, { manual: false }).catch(
        (error: Error) =>
          this.logger.warn(`Envoi du reçu ${cashReceiptId} impossible : ${error.message}`),
      );
    }
  }

  async sendCashReceipt(
    organizationId: string,
    cashReceiptId: string,
    options: SendOptions,
  ): Promise<{ notificationId: string }> {
    const loaded = await this.prisma.withTenant(organizationId, options.actorUserId ?? null, (tx) =>
      this.models.cashReceipt(tx, organizationId, cashReceiptId),
    );
    if (!loaded) throw new DomainError('CASH.RECEIPT_NOT_FOUND', { cashReceiptId });
    const row = loaded.row;
    const pdfLink = row.document_id ? this.links.shortLink(organizationId, row.document_id) : '';
    const result = await this.requireEnqueuer().enqueue({
      organizationId,
      templateCode: MESSAGE_TEMPLATE_CODES.CASH_RECEIPT_ISSUED,
      channelOrder: options.channel ? [options.channel] : undefined,
      recipient: {
        phone: row.payer_phone ?? row.tenant_phone,
        name: loaded.model.payerName,
        tenantId: row.tenant_id,
      },
      variables: {
        tenantName: loaded.model.tenantName,
        amount: formatXaf(row.amount),
        period: row.purpose ?? '',
        receiptNumber: row.receipt_number,
        link: pdfLink,
        pdfLink,
        organizationName: loaded.organizationName,
      },
      attachments: row.document_id
        ? [{ documentId: row.document_id, fileName: `recu-${row.receipt_number}.pdf` }]
        : [],
      relatedEntity: { type: 'cash_receipt', id: cashReceiptId },
      dedupeKey: options.manual ? null : `CASH_RECEIPT_ISSUED:${cashReceiptId}`,
      actorUserId: options.actorUserId ?? null,
    });
    return { notificationId: result.notificationId };
  }

  /** URL signée (10 min) du PDF d'une quittance, rendu à la demande au besoin. */
  async receiptPdf(
    organizationId: string,
    userId: string,
    receiptId: string,
  ): Promise<{ downloadUrl: string; expiresAt: string }> {
    const documentId = await this.documentOf(
      organizationId,
      userId,
      'receipts',
      receiptId,
      'RECEIPTS.NOT_FOUND',
    );
    if (documentId) return this.documents.createDownloadUrl(organizationId, userId, documentId);
    await this.generateReceipt(organizationId, receiptId, false);
    const generated = await this.documentOf(
      organizationId,
      userId,
      'receipts',
      receiptId,
      'RECEIPTS.NOT_FOUND',
    );
    if (!generated) throw new DomainError('RECEIPTS.PDF_UNAVAILABLE');
    return this.documents.createDownloadUrl(organizationId, userId, generated);
  }

  async cashReceiptPdf(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<{ downloadUrl: string; expiresAt: string }> {
    const documentId = await this.documentOf(
      organizationId,
      userId,
      'cash_receipts',
      id,
      'CASH.RECEIPT_NOT_FOUND',
    );
    if (documentId) return this.documents.createDownloadUrl(organizationId, userId, documentId);
    await this.generateCashReceipt(organizationId, id, false);
    const generated = await this.documentOf(
      organizationId,
      userId,
      'cash_receipts',
      id,
      'CASH.RECEIPT_NOT_FOUND',
    );
    if (!generated) throw new DomainError('RECEIPTS.PDF_UNAVAILABLE');
    return this.documents.createDownloadUrl(organizationId, userId, generated);
  }

  private async documentOf(
    organizationId: string,
    userId: string,
    table: 'receipts' | 'cash_receipts',
    id: string,
    notFound: 'RECEIPTS.NOT_FOUND' | 'CASH.RECEIPT_NOT_FOUND',
  ): Promise<string | null> {
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<Array<{ document_id: string | null }>>(
        `SELECT document_id FROM ${table} WHERE id = $1::uuid`,
        id,
      ),
    );
    if (!rows[0]) throw new DomainError(notFound, { id });
    return rows[0].document_id;
  }

  private async store(
    organizationId: string,
    kind: DocumentKind,
    pdf: Buffer,
    fileName: string,
    relatedEntityType: string,
    relatedEntityId: string,
  ): Promise<string> {
    const stored = await this.documents.storeGeneratedObject(organizationId, {
      kind,
      mimeType: 'application/pdf',
      body: pdf,
    });
    const document = await this.prisma.withTenant(organizationId, null, (tx) =>
      this.documents.registerStoredObject(tx, organizationId, null, stored, {
        kind,
        fileName,
        mimeType: 'application/pdf',
        relatedEntityType,
        relatedEntityId,
        checksumSha256: createHash('sha256').update(pdf).digest('base64'),
      }),
    );
    return document.id;
  }

  private requireEnqueuer(): NotificationEnqueuer {
    if (!this.enqueuer)
      throw new DomainError('PLATFORM.INTERNAL_ERROR', { reason: 'NOTIFICATIONS_UNAVAILABLE' });
    return this.enqueuer;
  }
}
