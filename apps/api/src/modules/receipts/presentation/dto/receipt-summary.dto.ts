import { ApiProperty } from '@nestjs/swagger';

export const RECEIPT_STATUSES = ['DRAFT', 'GENERATING', 'ISSUED', 'SENT', 'CANCELLED'] as const;
export const NOTIFICATION_CHANNELS = ['WHATSAPP', 'SMS', 'EMAIL', 'PUSH', 'IN_APP'] as const;

export class NamedTenantRefDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'Bernadette Loemba' }) displayName!: string;
}

export class ReceiptSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'QUI-202609-00001' }) receiptNumber!: string;
  @ApiProperty({ enum: RECEIPT_STATUSES }) status!: string;
  @ApiProperty({ format: 'date' }) issueDate!: string;
  @ApiProperty({ format: 'date', nullable: true, type: String }) periodStart!: string | null;
  @ApiProperty({ format: 'date', nullable: true, type: String }) periodEnd!: string | null;
  @ApiProperty({ type: 'integer', format: 'int64', example: 85_000 }) totalAmount!: number;
  @ApiProperty({ type: NamedTenantRefDto }) tenant!: NamedTenantRefDto;
  @ApiProperty({ format: 'uuid' }) paymentId!: string;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) invoiceId!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) sentAt!: string | null;
  @ApiProperty({ enum: NOTIFICATION_CHANNELS, nullable: true, type: String }) sentChannel!:
    string | null;
}
