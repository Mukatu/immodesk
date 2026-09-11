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
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { FEE_BEARERS, PAYMENT_METHODS, PAYMENT_STATUSES } from '../../domain/payment-rules';

const AMOUNT = { type: 'integer', format: 'int64', minimum: 1, example: 100_000 } as const;

export class AllocationInputDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() invoiceId!: string;
  @ApiProperty(AMOUNT) @Type(() => Number) @IsInt() @Min(1) amount!: number;
}

export class PaymentInputDto {
  @ApiProperty({ enum: PAYMENT_METHODS }) @IsIn([...PAYMENT_METHODS]) method!: string;
  @ApiProperty(AMOUNT) @Type(() => Number) @IsInt() @Min(1) amount!: number;
  @ApiProperty({ format: 'uuid' }) @IsUUID() tenantId!: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() leaseId?: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  paymentDate?: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  valueDate?: string;
  @ApiPropertyOptional({ example: 'MP260911.1234.A56789' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  externalReference?: string;

  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() bankAccountId?: string;

  @ApiPropertyOptional({ type: 'integer', format: 'int64', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  feeAmount?: number;

  @ApiPropertyOptional({ enum: FEE_BEARERS })
  @IsOptional()
  @IsIn([...FEE_BEARERS])
  feeBearer?: string;

  @ApiPropertyOptional({ description: 'Imputation « plus ancienne facture d’abord ».' })
  @IsOptional()
  @IsBoolean()
  autoAllocate?: boolean;

  @ApiPropertyOptional({ type: [AllocationInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AllocationInputDto)
  allocations?: AllocationInputDto[];

  @ApiPropertyOptional({ description: 'MANAGER / ACCOUNTANT : confirmer immédiatement.' })
  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;

  @ApiPropertyOptional({ description: 'ULID généré par l’appareil : clé d’idempotence.' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  clientRef?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;

  @ApiPropertyOptional({ minimum: -90, maximum: 90 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  collectionLatitude?: number;

  @ApiPropertyOptional({ minimum: -180, maximum: 180 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  collectionLongitude?: number;
}

export class AddAllocationsDto {
  @ApiProperty({ type: [AllocationInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AllocationInputDto)
  allocations!: AllocationInputDto[];
}

export class ConfirmPaymentDto {
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  valueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class ReasonDto {
  @ApiProperty({ example: 'Erreur de locataire' }) @IsString() @Length(3, 500) reason!: string;
}

export class ListPaymentsQueryDto {
  @ApiPropertyOptional({ enum: PAYMENT_METHODS })
  @IsOptional()
  @IsIn([...PAYMENT_METHODS])
  method?: string;
  @ApiPropertyOptional({ enum: PAYMENT_STATUSES })
  @IsOptional()
  @IsIn([...PAYMENT_STATUSES])
  status?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() tenantId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() leaseId?: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  from?: string;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601({ strict: false }) to?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(512) cursor?: string;
}

export class ApplyCreditDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() invoiceId!: string;

  @ApiPropertyOptional({
    ...AMOUNT,
    description: 'Défaut : le minimum du reste de l’avoir et du reste dû.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount?: number;
}

export class StatementQueryDto {
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  from?: string;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601({ strict: false }) to?: string;
}
