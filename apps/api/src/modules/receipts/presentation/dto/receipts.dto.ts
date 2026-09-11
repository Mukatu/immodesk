import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PageInfoDto } from '../../../parties/presentation/dto/landlords.dto';
import { NOTIFICATION_CHANNELS, RECEIPT_STATUSES, ReceiptSummaryDto } from './receipt-summary.dto';

const AMOUNT = { type: 'integer', format: 'int64', example: 85_000 } as const;
const NULLABLE = { nullable: true, type: String } as const;

export class ListReceiptsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() tenantId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() leaseId?: string;
  @ApiPropertyOptional({ example: '2026-09' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  period?: string;
  @ApiPropertyOptional({ enum: RECEIPT_STATUSES })
  @IsOptional()
  @IsIn([...RECEIPT_STATUSES])
  status?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(512) cursor?: string;
}

export class SendDocumentDto {
  @ApiPropertyOptional({
    enum: ['WHATSAPP', 'SMS'],
    description: 'Défaut : ordre des canaux de l’organisation.',
  })
  @IsOptional()
  @IsIn(['WHATSAPP', 'SMS'])
  channel?: 'WHATSAPP' | 'SMS';
}

export class NotificationAcceptedDto {
  @ApiProperty({ format: 'uuid' }) notificationId!: string;
}

export class PdfLinkDto {
  @ApiProperty({ description: 'URL signée, valable 10 minutes.' }) downloadUrl!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
}

export class MessageLogDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid', ...NULLABLE }) notificationId!: string | null;
  @ApiProperty({ enum: NOTIFICATION_CHANNELS }) channel!: string;
  @ApiProperty({ enum: ['QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'REJECTED', 'EXPIRED'] })
  status!: string;
  @ApiProperty({ example: 'meta-whatsapp' }) provider!: string;
  @ApiProperty(NULLABLE) providerMessageId!: string | null;
  @ApiProperty({ example: '+242066200001' }) toAddress!: string;
  @ApiProperty(NULLABLE) templateCode!: string | null;
  @ApiProperty(NULLABLE) contentPreview!: string | null;
  @ApiProperty(AMOUNT) costAmount!: number;
  @ApiProperty({ format: 'date-time' }) queuedAt!: string;
  @ApiProperty({ format: 'date-time', ...NULLABLE }) sentAt!: string | null;
  @ApiProperty({ format: 'date-time', ...NULLABLE }) deliveredAt!: string | null;
  @ApiProperty({ format: 'date-time', ...NULLABLE }) readAt!: string | null;
  @ApiProperty({ format: 'date-time', ...NULLABLE }) failedAt!: string | null;
  @ApiProperty(NULLABLE) errorCode!: string | null;
  @ApiProperty(NULLABLE) errorMessage!: string | null;
  @ApiProperty(NULLABLE) relatedEntityType!: string | null;
  @ApiProperty({ format: 'uuid', ...NULLABLE }) relatedEntityId!: string | null;
}

export class ReceiptDetailDto extends ReceiptSummaryDto {
  @ApiProperty(AMOUNT) rentAmount!: number;
  @ApiProperty(AMOUNT) chargesAmount!: number;
  @ApiProperty(AMOUNT) penaltyAmount!: number;
  @ApiProperty(AMOUNT) remainingBalanceAmount!: number;
  @ApiProperty({ example: 'https://app.immodesk.cg/verifier/3f9a…' }) verificationUrl!: string;
  @ApiProperty({ format: 'uuid', ...NULLABLE }) documentId!: string | null;
  @ApiProperty({ format: 'date-time', ...NULLABLE }) cancelledAt!: string | null;
  @ApiProperty(NULLABLE) cancellationReason!: string | null;
  @ApiProperty({ type: [MessageLogDto] }) messageLogs!: MessageLogDto[];
}

export class ReceiptPageDto {
  @ApiProperty({ type: [ReceiptSummaryDto] }) items!: ReceiptSummaryDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}

export class ReceiptVerificationDto {
  @ApiProperty({ example: 'QUI-202609-00001' }) receiptNumber!: string;
  @ApiProperty({ format: 'date' }) issueDate!: string;
  @ApiProperty({ ...NULLABLE, example: 'septembre 2026' }) period!: string | null;
  @ApiProperty(AMOUNT) totalAmount!: number;
  @ApiProperty({ example: 'Bernadette Loemba' }) tenantName!: string;
  @ApiProperty({ example: 'SCI Les Manguiers' }) landlordDisplayName!: string;
  @ApiProperty({ example: 'Agence Mpila Immo' }) organizationName!: string;
  @ApiProperty({ enum: RECEIPT_STATUSES }) status!: string;
}
