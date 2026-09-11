import { Inject, Injectable, Optional } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { isUniqueViolation } from '../../../shared/prisma/sql-errors';
import { readOperationalSettings } from '../../../shared/settings/operational-settings';
import { businessToday } from '../../../shared/time/business-date';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { DocumentsService } from '../../documents/application/documents.service';
import { NumberingService } from '../../numbering/application/numbering.service';
import {
  cashReceiptPrefix,
  cashReceiptSequenceKey,
  SEQUENCE_FORMATS,
} from '../../numbering/domain/sequence-kind';
import { displayNameOf, type PartyType } from '../../parties/domain/party-rules';
import { PaymentsService } from '../../payments/application/payments.service';
import type { PaymentReader } from '../../payments/application/payments-query.service';
import type { AllocationRequest } from '../../payments/domain/allocation-engine';
import {
  RECEIPT_ISSUER,
  type CashReceiptCanceller,
  type ReceiptIssuer,
} from '../../payments/domain/ports';
import { parseSignatureDataUrl, type ParsedSignature } from '../domain/cash-rules';
import { CASH_RECEIPT_PUBLISHER, type CashReceiptPublisher } from '../domain/ports';
import { CashReceiptsQueryService } from './cash-receipts-query.service';
import type { CashReceiptDetailView } from './cash-receipt-views';

export interface CashReceiptInput {
  tenantId: string;
  leaseId?: string | null;
  amount: bigint;
  payerName?: string | null;
  payerPhone?: string | null;
  purpose?: string | null;
  receivedAt?: Date;
  autoAllocate?: boolean;
  allocations?: AllocationRequest[];
  signatureDataUrl?: string | null;
  paperReceiptDocumentId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  clientRef: string;
}

/**
 * Encaissement en espèces (docs/api/phase3-contract.md, § « Espèces »).
 *
 * Une seule transaction écrit le paiement CASH CONFIRMED, les imputations, le
 * reçu numéroté `CASH-{org}-{collector}-{seq}` et la fiche de la signature.
 * La signature est DÉPOSÉE avant la transaction : un envoi vers le stockage
 * ne doit pas tenir une connexion ni un verrou de numérotation.
 */
@Injectable()
export class CashReceiptsService implements CashReceiptCanceller {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbering: NumberingService,
    private readonly payments: PaymentsService,
    private readonly documents: DocumentsService,
    private readonly queries: CashReceiptsQueryService,
    private readonly auditService: AuditService,
    @Optional() @Inject(RECEIPT_ISSUER) private readonly receipts: ReceiptIssuer | null = null,
    @Optional()
    @Inject(CASH_RECEIPT_PUBLISHER)
    private readonly publisher: CashReceiptPublisher | null = null,
  ) {}

  async create(
    organizationId: string,
    reader: PaymentReader,
    input: CashReceiptInput,
  ): Promise<{ detail: CashReceiptDetailView; replayed: boolean }> {
    const replay = await this.replay(organizationId, reader, input.clientRef);
    if (replay) return { detail: replay, replayed: true };

    const settings = await this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      tx.organization_settings.findUnique({
        where: { organization_id: organizationId },
        select: { settings_json: true },
      }),
    );
    const operational = readOperationalSettings(settings?.settings_json);
    const signature = input.signatureDataUrl ? parseSignatureDataUrl(input.signatureDataUrl) : null;
    if (!signature && (operational.cash.requireTenantSignature || !input.paperReceiptDocumentId)) {
      throw new DomainError('CASH.SIGNATURE_REQUIRED', {
        requireTenantSignature: operational.cash.requireTenantSignature,
      });
    }
    const stored = signature
      ? await this.documents.storeGeneratedObject(organizationId, {
          kind: 'SIGNATURE',
          mimeType: 'image/png',
          body: signature.body,
        })
      : null;

    try {
      const { id, receiptIds } = await this.prisma.withTenant(
        organizationId,
        reader.userId,
        (tx) => this.createInTx(tx, organizationId, reader, input, signature, stored),
        { timeout: 30_000, maxWait: 30_000 },
      );
      await this.receipts?.scheduleGeneration(organizationId, receiptIds);
      await this.publisher?.schedule(organizationId, id, {
        notify: operational.messaging.sendCashReceiptToTenant,
      });
      return { detail: await this.queries.get(organizationId, reader, id), replayed: false };
    } catch (error) {
      if (isUniqueViolation(error, 'client_ref')) {
        const again = await this.replay(organizationId, reader, input.clientRef);
        if (again) return { detail: again, replayed: true };
      }
      throw error;
    }
  }

  private async createInTx(
    tx: TenantClient,
    organizationId: string,
    reader: PaymentReader,
    input: CashReceiptInput,
    signature: ParsedSignature | null,
    stored: { documentId: string; objectKey: string; sizeBytes: number } | null,
  ): Promise<{ id: string; receiptIds: string[] }> {
    const receivedAt = input.receivedAt ?? new Date();
    const tenant = await tx.tenants.findFirst({
      where: { id: input.tenantId, deleted_at: null },
      select: {
        party_type: true,
        first_name: true,
        last_name: true,
        company_name: true,
        primary_phone: true,
      },
    });
    if (!tenant) throw new DomainError('PARTIES.TENANT_NOT_FOUND', { tenantId: input.tenantId });
    if (input.paperReceiptDocumentId && !signature) {
      const paper = await tx.documents.findFirst({
        where: { id: input.paperReceiptDocumentId, deleted_at: null },
        select: { id: true },
      });
      if (!paper)
        throw new DomainError('DOCUMENTS.NOT_FOUND', { documentId: input.paperReceiptDocumentId });
    }

    // Le paiement prend le verrou de la série PAY en premier ; le compteur du
    // démarcheur est réservé ensuite, le plus tard possible.
    const created = await this.payments.createInTx(
      tx,
      organizationId,
      { ...reader, receivedByUserId: reader.userId },
      {
        method: 'CASH',
        amount: input.amount,
        tenantId: input.tenantId,
        leaseId: input.leaseId ?? null,
        paymentDate: businessToday(receivedAt),
        autoAllocate:
          input.allocations && input.allocations.length > 0 ? false : (input.autoAllocate ?? true),
        allocations: input.allocations,
        clientRef: input.clientRef,
        collectionLatitude: input.latitude ?? null,
        collectionLongitude: input.longitude ?? null,
      },
    );

    const id = newId();
    if (stored) {
      await this.documents.registerStoredObject(tx, organizationId, reader.userId, stored, {
        kind: 'SIGNATURE',
        fileName: `signature-${id}.png`,
        mimeType: 'image/png',
        relatedEntityType: 'cash_receipt',
        relatedEntityId: id,
        checksumSha256: signature?.sha256 ?? null,
      });
    }

    const organization = await tx.organizations.findUnique({
      where: { id: organizationId },
      select: { slug: true },
    });
    const { number } = await this.numbering.nextNumberFor(
      tx,
      organizationId,
      cashReceiptSequenceKey(reader.userId),
      {
        ...SEQUENCE_FORMATS.CASH_RECEIPT,
        prefix: cashReceiptPrefix(organization?.slug ?? 'org', reader.userId),
      },
    );

    await tx.cash_receipts.create({
      data: {
        id,
        organization_id: organizationId,
        payment_id: created.payment.id,
        lease_id: input.leaseId ?? null,
        tenant_id: input.tenantId,
        collector_user_id: reader.userId,
        receipt_number: number,
        status: 'ISSUED',
        amount: input.amount,
        received_at: receivedAt,
        payer_name:
          input.payerName?.trim() ||
          displayNameOf({
            partyType: tenant.party_type as PartyType,
            firstName: tenant.first_name,
            lastName: tenant.last_name,
            companyName: tenant.company_name,
          }),
        payer_phone: input.payerPhone ?? tenant.primary_phone,
        purpose: input.purpose ?? null,
        latitude: input.latitude != null ? input.latitude.toFixed(6) : null,
        longitude: input.longitude != null ? input.longitude.toFixed(6) : null,
        signature_document_id: stored?.documentId ?? input.paperReceiptDocumentId ?? null,
        signature_hash: signature?.sha256 ?? null,
        client_ref: input.clientRef,
      },
    });
    await audit(this.auditService, tx, {
      organizationId,
      action: 'CREATE',
      operation: AUDIT_OPERATIONS.CASH_RECEIPT_ISSUED,
      entityType: 'cash_receipts',
      entityId: id,
      newState: toJsonState({
        receiptNumber: number,
        amount: input.amount,
        paymentId: created.payment.id,
        signatureHash: signature?.sha256 ?? null,
      }),
    });
    return { id, receiptIds: created.receiptIds };
  }

  /** Port `CASH_RECEIPT_CANCELLER` : annulation par contre-passation du paiement. */
  async cancelForPayment(
    tx: TenantClient,
    input: { organizationId: string; paymentId: string; reason: string },
  ): Promise<string[]> {
    const rows = await tx.$queryRawUnsafe<Array<{ id: string; status: string }>>(
      `WITH target AS (
         SELECT id, status::text AS status FROM cash_receipts
          WHERE payment_id = $1::uuid AND status <> 'CANCELLED' FOR UPDATE
       )
       UPDATE cash_receipts cr
          SET status = 'CANCELLED', cancelled_at = now(), cancellation_reason = $2, updated_at = now()
         FROM target WHERE cr.id = target.id
       RETURNING cr.id, target.status`,
      input.paymentId,
      input.reason,
    );
    for (const row of rows) {
      await audit(this.auditService, tx, {
        organizationId: input.organizationId,
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.CASH_RECEIPT_CANCELLED,
        entityType: 'cash_receipts',
        entityId: row.id,
        previousState: toJsonState({ status: row.status }),
        newState: toJsonState({
          status: 'CANCELLED',
          reason: input.reason,
          paymentId: input.paymentId,
        }),
      });
    }
    return rows.map((r) => r.id);
  }

  private async replay(
    organizationId: string,
    reader: PaymentReader,
    clientRef: string,
  ): Promise<CashReceiptDetailView | null> {
    const existing = await this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      tx.cash_receipts.findFirst({ where: { client_ref: clientRef }, select: { id: true } }),
    );
    return existing ? this.queries.get(organizationId, reader, existing.id) : null;
  }
}
