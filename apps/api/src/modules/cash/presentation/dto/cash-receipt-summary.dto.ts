import { ApiProperty } from '@nestjs/swagger';
import { NamedTenantRefDto } from '../../../receipts/presentation/dto/receipt-summary.dto';

export const CASH_RECEIPT_STATUSES = ['DRAFT', 'ISSUED', 'REMITTED', 'CANCELLED'] as const;

export class CashReceiptSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'CASH-AMI-3F9A1C-000012' }) receiptNumber!: string;
  @ApiProperty({ enum: CASH_RECEIPT_STATUSES }) status!: string;
  @ApiProperty({ type: 'integer', format: 'int64', example: 100_000 }) amount!: number;
  @ApiProperty({ format: 'date-time' }) receivedAt!: string;
  @ApiProperty({ type: NamedTenantRefDto }) tenant!: NamedTenantRefDto;
  @ApiProperty({ format: 'uuid' }) collectorUserId!: string;
  @ApiProperty({ example: 'Alphonse Ngoma' }) collectorName!: string;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) remittanceId!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) paymentId!: string | null;
}
