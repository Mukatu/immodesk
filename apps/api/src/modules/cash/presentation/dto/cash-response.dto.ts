import { ApiProperty } from '@nestjs/swagger';
import { PageInfoDto } from '../../../parties/presentation/dto/landlords.dto';
import { REMITTANCE_STATUSES } from '../../domain/cash-rules';
import { CashReceiptSummaryDto } from './cash-receipt-summary.dto';

const AMOUNT = { type: 'integer', format: 'int64', example: 100_000 } as const;
const NULLABLE = { nullable: true, type: String } as const;

export class CashReceiptAllocationDto {
  @ApiProperty({ format: 'uuid' }) invoiceId!: string;
  @ApiProperty(NULLABLE) invoiceNumber!: string | null;
  @ApiProperty(AMOUNT) amount!: number;
}

export class CashReceiptDetailDto extends CashReceiptSummaryDto {
  @ApiProperty() payerName!: string;
  @ApiProperty(NULLABLE) payerPhone!: string | null;
  @ApiProperty(NULLABLE) purpose!: string | null;
  @ApiProperty({ format: 'uuid', ...NULLABLE }) leaseId!: string | null;
  @ApiProperty({ format: 'uuid', ...NULLABLE }) signatureDocumentId!: string | null;
  @ApiProperty({ ...NULLABLE, description: 'SHA-256 hexadécimal de la signature.' })
  signatureHash!: string | null;
  @ApiProperty({ format: 'uuid', ...NULLABLE }) documentId!: string | null;
  @ApiProperty({ type: [CashReceiptAllocationDto] }) allocations!: CashReceiptAllocationDto[];
  @ApiProperty({ format: 'date-time', ...NULLABLE }) cancelledAt!: string | null;
  @ApiProperty(NULLABLE) cancellationReason!: string | null;
  @ApiProperty(NULLABLE) clientRef!: string | null;
}

export class CashReceiptPageDto {
  @ApiProperty({ type: [CashReceiptSummaryDto] }) items!: CashReceiptSummaryDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}

export class CollectorBalanceDto {
  @ApiProperty({ format: 'uuid' }) userId!: string;
  @ApiProperty({ example: 'Alphonse Ngoma' }) fullName!: string;
  @ApiProperty(AMOUNT) heldAmount!: number;
  @ApiProperty() receiptsCount!: number;
  @ApiProperty({ format: 'date-time', ...NULLABLE }) oldestReceiptAt!: string | null;
  @ApiProperty(AMOUNT) capAmount!: number;
  @ApiProperty() overCap!: boolean;
  @ApiProperty({ format: 'date-time', ...NULLABLE }) lastRemittanceAt!: string | null;
}

export class CollectorBalanceListDto {
  @ApiProperty({ type: [CollectorBalanceDto] }) items!: CollectorBalanceDto[];
}

export class RemittanceSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'REM-202609-00001' }) reference!: string;
  @ApiProperty({ enum: REMITTANCE_STATUSES }) status!: string;
  @ApiProperty({ format: 'uuid' }) collectorUserId!: string;
  @ApiProperty() collectorName!: string;
  @ApiProperty(AMOUNT) declaredAmount!: number;
  @ApiProperty(AMOUNT) expectedAmount!: number;
  @ApiProperty(AMOUNT) countedAmount!: number;
  @ApiProperty({ ...AMOUNT, description: 'Compté − attendu : négatif = manquant.' })
  varianceAmount!: number;
  @ApiProperty() receiptsCount!: number;
  @ApiProperty({ format: 'date-time' }) openedAt!: string;
  @ApiProperty({ format: 'date-time', ...NULLABLE }) submittedAt!: string | null;
  @ApiProperty({ format: 'date-time', ...NULLABLE }) verifiedAt!: string | null;
}

export class RemittanceItemDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) cashReceiptId!: string;
  @ApiProperty() receiptNumber!: string;
  @ApiProperty(AMOUNT) amount!: number;
  @ApiProperty() isVerified!: boolean;
  @ApiProperty(AMOUNT) varianceAmount!: number;
  @ApiProperty(NULLABLE) varianceReason!: string | null;
}

export class RemittanceDetailDto extends RemittanceSummaryDto {
  @ApiProperty({ type: [RemittanceItemDto] }) items!: RemittanceItemDto[];
  @ApiProperty({ type: 'object', additionalProperties: { type: 'integer' } })
  denominations!: Record<string, number>;
  @ApiProperty({ format: 'uuid', ...NULLABLE }) verifiedByUserId!: string | null;
  @ApiProperty(NULLABLE) rejectionReason!: string | null;
  @ApiProperty({ format: 'date-time', ...NULLABLE }) depositedAt!: string | null;
  @ApiProperty({ format: 'uuid', ...NULLABLE }) depositBankAccountId!: string | null;
  @ApiProperty(NULLABLE) notes!: string | null;
}

export class RemittancePageDto {
  @ApiProperty({ type: [RemittanceSummaryDto] }) items!: RemittanceSummaryDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}
