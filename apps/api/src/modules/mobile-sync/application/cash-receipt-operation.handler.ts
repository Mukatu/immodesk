import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { CashReceiptsService } from '../../cash/application/cash-receipts.service';
import { DomainError } from '../../../shared/errors/domain-error';
import { AmountError, toAmount } from '../../../shared/money/amount';
import type {
  SyncApplyResult,
  SyncErrorVerdict,
  SyncOperationHandler,
} from '../domain/operation-handler';
import { classifyDomainError } from '../domain/error-classification';
import type { SyncReader } from '../domain/sync-types';

/**
 * Corps identique à `POST /v1/cash-receipts` (docs/api/phase5-contract.md,
 * arbitrage 1 : « payload : corps identique à la route en ligne »).
 */
const cashReceiptOperationSchema = z.object({
  tenantId: z.string().uuid(),
  leaseId: z.string().uuid().optional(),
  amount: z.union([z.number(), z.string()]),
  payerName: z.string().max(120).optional(),
  payerPhone: z.string().max(24).optional(),
  purpose: z.string().max(200).optional(),
  receivedAt: z.string().optional(),
  autoAllocate: z.boolean().optional(),
  allocations: z
    .array(z.object({ invoiceId: z.string().uuid(), amount: z.union([z.number(), z.string()]) }))
    .max(50)
    .optional(),
  signatureDataUrl: z.string().max(720_000).optional(),
  paperReceiptDocumentId: z.string().uuid().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

/**
 * Gestionnaire `CASH_RECEIPT` : réutilise `CashReceiptsService.create`, qui
 * porte déjà sa propre transaction ET l'idempotence par `client_ref`. Le
 * moteur de lots n'a donc rien de plus à faire pour garantir « appliqué dans
 * sa propre transaction, sans doublon au rejeu ».
 */
@Injectable()
export class CashReceiptOperationHandler implements SyncOperationHandler {
  readonly type = 'CASH_RECEIPT' as const;
  readonly resourceType = 'cash_receipts';

  constructor(private readonly cashReceipts: CashReceiptsService) {}

  async apply(
    organizationId: string,
    reader: SyncReader,
    payload: unknown,
    context: { clientRef: string; syncBatchId: string },
  ): Promise<SyncApplyResult> {
    const parsed = cashReceiptOperationSchema.safeParse(payload);
    if (!parsed.success) {
      throw new DomainError('VALIDATION.INVALID_PAYLOAD', {
        fields: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    const dto = parsed.data;
    try {
      const { detail, replayed } = await this.cashReceipts.create(organizationId, reader, {
        tenantId: dto.tenantId,
        leaseId: dto.leaseId ?? null,
        amount: toAmount(dto.amount),
        payerName: dto.payerName ?? null,
        payerPhone: dto.payerPhone ?? null,
        purpose: dto.purpose ?? null,
        receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : undefined,
        autoAllocate: dto.autoAllocate,
        allocations: dto.allocations?.map((a) => ({
          invoiceId: a.invoiceId,
          amount: toAmount(a.amount),
        })),
        signatureDataUrl: dto.signatureDataUrl ?? null,
        paperReceiptDocumentId: dto.paperReceiptDocumentId ?? null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        clientRef: context.clientRef,
        syncBatchId: context.syncBatchId,
      });
      return { replayed, resourceId: (detail as { id: string }).id };
    } catch (error) {
      if (error instanceof AmountError) {
        throw new DomainError('VALIDATION.INVALID_PAYLOAD', { amount: error.message });
      }
      throw error;
    }
  }

  classify(error: unknown): SyncErrorVerdict | null {
    return classifyDomainError(error);
  }
}
