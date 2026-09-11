import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MAX_PAYMENT_DUE_DAY } from '../../domain/calendar';
import {
  LEASE_DOCUMENT_KINDS,
  LEASE_PARTY_ROLES,
  LEASE_STATUSES,
  PAYMENT_METHODS,
  RENT_PERIODS,
} from '../../domain/lease-status';

const STATUS_VALUES = [...LEASE_STATUSES];
const PERIOD_VALUES = [...RENT_PERIODS];
const METHOD_VALUES = [...PAYMENT_METHODS];
const ROLE_VALUES = [...LEASE_PARTY_ROLES];
const DOCUMENT_KIND_VALUES = [...LEASE_DOCUMENT_KINDS];

/** Montant XAF : entier, jamais de décimale (`src/shared/money/amount.ts`). */
const AMOUNT = { type: 'integer', format: 'int64', minimum: 0 } as const;

export class LeaseBodyDto {
  @ApiPropertyOptional({ format: 'date', example: '2026-06-01' })
  @IsOptional()
  @IsISO8601({ strict: false })
  endDate?: string;

  @ApiPropertyOptional({ format: 'date', example: '2026-01-05' })
  @IsOptional()
  @IsISO8601({ strict: false })
  moveInDate?: string;

  @ApiPropertyOptional({ enum: PERIOD_VALUES, default: 'MONTHLY' })
  @IsOptional()
  @IsIn(PERIOD_VALUES)
  rentPeriod?: string;

  @ApiPropertyOptional({ ...AMOUNT, example: 10_000, description: 'Charges forfaitaires en XAF.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  chargesAmount?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  chargesAreProvisional?: boolean;

  @ApiPropertyOptional({
    ...AMOUNT,
    example: 300_000,
    description: 'Dépôt de garantie. Défaut : `unit.depositMonths` × loyer.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  depositAmount?: number;

  @ApiPropertyOptional({ ...AMOUNT, example: 150_000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  agencyFeeAmount?: number;

  @ApiPropertyOptional({ example: 0, description: "Mois de loyer payés d'avance à l'entrée." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(24)
  advanceMonths?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_PAYMENT_DUE_DAY,
    example: 5,
    description: `Borné à ${MAX_PAYMENT_DUE_DAY} par le DDL : aucun mois ne doit manquer l'échéance.`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAYMENT_DUE_DAY)
  paymentDueDay?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 60, example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  graceDays?: number;

  @ApiPropertyOptional({ enum: METHOD_VALUES, default: 'CASH' })
  @IsOptional()
  @IsIn(METHOD_VALUES)
  preferredPaymentMethod?: string;

  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() collectorUserId?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 365, example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  noticeDays?: number;

  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() autoRenew?: boolean;

  @ApiPropertyOptional({ example: 500, description: '100 % = 10 000 points de base.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  indexationRateBps?: number;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  nextIndexationDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) notes?: string;

  @ApiPropertyOptional({ description: "Clé d'idempotence générée sur l'appareil (ULID)." })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientRef?: string;
}

export class CreateLeaseDto extends LeaseBodyDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() unitId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() primaryTenantId!: string;

  @ApiProperty({ format: 'date', example: '2026-01-01' })
  @IsISO8601({ strict: false })
  startDate!: string;

  @ApiProperty({ ...AMOUNT, example: 150_000, description: 'Loyer contractuel en XAF.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  rentAmount!: number;
}

export class UpdateLeaseDto extends LeaseBodyDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() unitId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() primaryTenantId?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  startDate?: string;

  @ApiPropertyOptional(AMOUNT)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  rentAmount?: number;
}

export class ListLeasesQueryDto {
  @ApiPropertyOptional({ enum: STATUS_VALUES }) @IsOptional() @IsIn(STATUS_VALUES) status?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() propertyId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() tenantId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() unitId?: string;

  @ApiPropertyOptional({ example: 90, description: 'Baux dont le terme tombe dans N jours.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  endingWithinDays?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) q?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(512) cursor?: string;
}

export { ROLE_VALUES, DOCUMENT_KIND_VALUES, STATUS_VALUES, PERIOD_VALUES, METHOD_VALUES, AMOUNT };
export { Length };
