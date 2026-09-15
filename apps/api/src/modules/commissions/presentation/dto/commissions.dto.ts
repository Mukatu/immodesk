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
import { COMMISSION_STATUSES } from '../../domain/commission-rules';
import { COMMISSION_BASES } from '../../../mandates/domain/mandate-rules';

const AMOUNT = { type: 'integer', format: 'int64', minimum: 0, example: 45_000 } as const;
const BPS = { type: 'integer', minimum: 0, maximum: 10_000 } as const;

export class ListCommissionsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() mandateId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() landlordId?: string;
  @ApiPropertyOptional({ example: '2026-08', description: 'AAAA-MM' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  period?: string;
  @ApiPropertyOptional({ enum: COMMISSION_STATUSES })
  @IsOptional()
  @IsIn(COMMISSION_STATUSES)
  status?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(512) cursor?: string;
}

export class CommissionDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) mandateId!: string | null;
  @ApiProperty({ format: 'uuid' }) landlordId!: string;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) leaseId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) propertyId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) invoiceId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) paymentId!: string | null;
  @ApiProperty({ enum: COMMISSION_STATUSES }) status!: string;
  @ApiProperty({ enum: COMMISSION_BASES }) basis!: string;
  @ApiProperty({ format: 'date' }) periodStart!: string;
  @ApiProperty({ format: 'date' }) periodEnd!: string;
  @ApiProperty(AMOUNT) baseAmount!: number;
  @ApiProperty({ nullable: true, ...BPS }) rateBps!: number | null;
  @ApiProperty({ nullable: true, ...AMOUNT }) flatAmount!: number | null;
  @ApiProperty(AMOUNT) amount!: number;
  @ApiProperty(BPS) vatRateBps!: number;
  @ApiProperty(AMOUNT) vatAmount!: number;
  @ApiProperty(AMOUNT) totalAmount!: number;
  @ApiProperty({ example: 'XAF' }) currency!: 'XAF';
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) ownerStatementId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) accruedAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) settledAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) reversalOfId!: string | null;
  @ApiProperty({ nullable: true, type: String }) notes!: string | null;
}

export class CommissionTotalsDto {
  @ApiProperty(AMOUNT) amount!: number;
  @ApiProperty(AMOUNT) vatAmount!: number;
  @ApiProperty(AMOUNT) totalAmount!: number;
}

export class CommissionPageDto {
  @ApiProperty({ type: [CommissionDto] }) items!: CommissionDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
  @ApiProperty({ type: CommissionTotalsDto }) totals!: CommissionTotalsDto;
}
