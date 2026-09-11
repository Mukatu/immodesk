import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AllocationInputDto } from '../../../payments/presentation/dto/payments.dto';
import { REMITTANCE_STATUSES } from '../../domain/cash-rules';
import { CASH_RECEIPT_STATUSES } from './cash-receipt-summary.dto';

const AMOUNT = { type: 'integer', format: 'int64', example: 100_000 } as const;

export class CashReceiptInputDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() tenantId!: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() leaseId?: string;
  @ApiProperty({ ...AMOUNT, minimum: 1 }) @Type(() => Number) @IsInt() @Min(1) amount!: number;
  @ApiPropertyOptional({ example: 'Bernadette Loemba' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  payerName?: string;
  @ApiPropertyOptional({ example: '+242066200001' })
  @IsOptional()
  @IsString()
  @MaxLength(24)
  payerPhone?: string;
  @ApiPropertyOptional({ example: 'Loyer de septembre' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  purpose?: string;
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601({ strict: true })
  receivedAt?: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() autoAllocate?: boolean;

  @ApiPropertyOptional({ type: [AllocationInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AllocationInputDto)
  allocations?: AllocationInputDto[];

  @ApiPropertyOptional({
    description: 'Signature du locataire : `data:image/png;base64,...`, 512 Ko au plus.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(720_000)
  signatureDataUrl?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Photo du reçu papier signé (si la signature n’est pas exigée).',
  })
  @IsOptional()
  @IsUUID()
  paperReceiptDocumentId?: string;

  @ApiPropertyOptional({ minimum: -90, maximum: 90 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;
  @ApiPropertyOptional({ minimum: -180, maximum: 180 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({ description: 'ULID de l’appareil : clé d’idempotence obligatoire.' })
  @IsString()
  @Length(1, 64)
  clientRef!: string;
}

export class ListCashReceiptsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() collectorUserId?: string;
  @ApiPropertyOptional({ enum: CASH_RECEIPT_STATUSES })
  @IsOptional()
  @IsIn([...CASH_RECEIPT_STATUSES])
  status?: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  from?: string;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601({ strict: false }) to?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(512) cursor?: string;
}

export class RemittanceInputDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  cashReceiptIds!: string[];

  @ApiProperty({ ...AMOUNT, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  declaredAmount!: number;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'integer' },
    example: { '10000': 70, '5000': 10 },
  })
  @IsOptional()
  @IsObject()
  denominations?: Record<string, number>;

  @ApiPropertyOptional({ default: true, description: '`false` : brouillon OPEN.' })
  @IsOptional()
  @IsBoolean()
  submit?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 64) clientRef?: string;
}

export class RemittanceVerifyItemDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() cashReceiptId!: string;
  @ApiProperty() @IsBoolean() isVerified!: boolean;
  @ApiPropertyOptional(AMOUNT) @IsOptional() @Type(() => Number) @IsInt() varianceAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) varianceReason?: string;
}

export class RemittanceVerifyDto {
  @ApiProperty({ ...AMOUNT, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  countedAmount!: number;

  @ApiPropertyOptional({ type: [RemittanceVerifyItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RemittanceVerifyItemDto)
  items?: RemittanceVerifyItemDto[];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class RemittanceDepositDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() bankAccountId!: string;
  @ApiProperty({ format: 'date-time' }) @IsISO8601({ strict: false }) depositedAt!: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() depositSlipDocumentId?: string;
}

export class ListRemittancesQueryDto {
  @ApiPropertyOptional({ enum: REMITTANCE_STATUSES })
  @IsOptional()
  @IsIn([...REMITTANCE_STATUSES])
  status?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() collectorUserId?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(512) cursor?: string;
}
