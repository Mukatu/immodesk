import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { INVOICE_LINE_TYPES } from '../../domain/invoice-lines';
import { INVOICE_STATUSES } from '../../domain/invoice-status';
import { PENALTY_BASES } from '../../domain/penalties';

const AMOUNT = { type: 'integer', format: 'int64', minimum: 0, example: 85_000 } as const;
const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Booléen de chaîne de requête : `true`, `1`. */
export const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === true || value === 'true' || value === '1'
    ? true
    : value === 'false' || value === '0'
      ? false
      : value;

export class InvoiceLineInputDto {
  @ApiProperty({ enum: INVOICE_LINE_TYPES }) @IsIn([...INVOICE_LINE_TYPES]) lineType!: string;

  @ApiProperty({ example: 'Loyer septembre 2026' }) @IsString() @Length(1, 200) label!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) description?: string;

  @ApiPropertyOptional({ example: 1, minimum: 0, description: 'Trois décimales au plus.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  quantity?: number;

  @ApiProperty(AMOUNT) @Type(() => Number) @IsInt() @Min(0) unitPriceAmount!: number;

  @ApiPropertyOptional({ ...AMOUNT, description: 'Défaut : quantité × prix unitaire, arrondi.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 10_000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  vatRateBps?: number;

  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() isCredit?: boolean;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  periodStart?: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  periodEnd?: string;
}

export class CreateInvoiceDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() leaseId!: string;
  @ApiProperty({ format: 'date', example: '2026-10-01' })
  @IsISO8601({ strict: false })
  periodStart!: string;
  @ApiProperty({ format: 'date', example: '2026-10-31' })
  @IsISO8601({ strict: false })
  periodEnd!: string;

  @ApiPropertyOptional({ format: 'date', description: 'Défaut : jour d’échéance du bail.' })
  @IsOptional()
  @IsISO8601({ strict: false })
  dueDate?: string;

  @ApiProperty({ type: [InvoiceLineInputDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineInputDto)
  lines!: InvoiceLineInputDto[];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;

  @ApiPropertyOptional({ default: false, description: 'Émettre immédiatement (numéro attribué).' })
  @IsOptional()
  @IsBoolean()
  issue?: boolean;
}

export class CancelInvoiceDto {
  @ApiProperty({ example: 'Facture émise sur le mauvais bail' })
  @IsString()
  @Length(3, 500)
  reason!: string;
}

export class ListInvoicesQueryDto {
  @ApiPropertyOptional({ enum: INVOICE_STATUSES })
  @IsOptional()
  @IsIn([...INVOICE_STATUSES])
  status?: string;

  @ApiPropertyOptional({ example: '2026-09', description: 'Mois de début de période.' })
  @IsOptional()
  @Matches(YEAR_MONTH)
  period?: string;

  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() propertyId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() leaseId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() tenantId?: string;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  overdueOnly?: boolean;

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

export class StartBillingRunDto {
  @ApiPropertyOptional({ format: 'date', description: 'Période ciblée (sinon : règle J-N).' })
  @IsOptional()
  @IsISO8601({ strict: false })
  periodStart?: string;

  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() dryRun?: boolean;
}

export class DashboardQueryDto {
  @ApiPropertyOptional({ example: '2026-09' }) @IsOptional() @Matches(YEAR_MONTH) period?: string;
}

export class PenaltyRuleInputDto {
  @ApiProperty({ example: 'Retard standard 5 % par mois' })
  @IsString()
  @Length(2, 120)
  name!: string;
  @ApiProperty({ enum: PENALTY_BASES }) @IsIn([...PENALTY_BASES]) basis!: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 10_000, example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  rateBps?: number;

  @ApiPropertyOptional(AMOUNT)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  flatAmount?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 60, default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  graceDays?: number;

  @ApiPropertyOptional(AMOUNT)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  capAmount?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 10_000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  capRateBps?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPeriods?: number;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() appliesToCharges?: boolean;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class UpdatePenaltyRuleDto extends PartialType(PenaltyRuleInputDto) {}
