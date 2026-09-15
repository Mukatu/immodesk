import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PageInfoDto } from '../../../parties/presentation/dto/landlords.dto';
import { FEE_BEARERS, PAYMENT_METHODS } from '../../../payments/domain/payment-rules';
import { PAYOUT_STATUSES } from '../../domain/owner-payout-rules';

const AMOUNT = { type: 'integer', format: 'int64', example: 450_000 } as const;
const POSITIVE_AMOUNT = { ...AMOUNT, minimum: 0 } as const;

export class CreatePayoutDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() statementId!: string;

  @ApiPropertyOptional({
    enum: PAYMENT_METHODS,
    description: 'Par défaut : `landlords.payout_method`.',
  })
  @IsOptional()
  @IsIn(PAYMENT_METHODS)
  method?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Par défaut : `landlords.default_bank_account_id`.',
  })
  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

  @ApiPropertyOptional({ ...POSITIVE_AMOUNT, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  feeAmount?: number;

  @ApiPropertyOptional({ enum: FEE_BEARERS, default: 'LANDLORD' })
  @IsOptional()
  @IsIn(FEE_BEARERS)
  feeBearer?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  scheduledDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) clientRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class ExecutePayoutDto {
  @ApiPropertyOptional({
    description: 'Virement/chèque/espèces : référence externe déclarée par l’appelant.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  externalReference?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Un `documents.id` déjà existant (référence seule).',
  })
  @IsOptional()
  @IsUUID()
  proofDocumentId?: string;
}

export class FailPayoutDto {
  @ApiProperty({ example: 'Solde Mobile Money insuffisant chez l’agrégateur.' })
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class ListOwnerPayoutsQueryDto {
  @ApiPropertyOptional({ enum: PAYOUT_STATUSES })
  @IsOptional()
  @IsIn(PAYOUT_STATUSES)
  status?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() landlordId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(512) cursor?: string;
}

/** `Payout` du contrat (docs/api/phase7-contract.md, § Types). */
export class PayoutDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) statementId!: string | null;
  @ApiProperty({ format: 'uuid' }) landlordId!: string;
  @ApiProperty({ enum: PAYOUT_STATUSES }) status!: string;
  @ApiProperty({ enum: PAYMENT_METHODS }) method!: string;
  @ApiProperty(POSITIVE_AMOUNT) amount!: number;
  @ApiProperty(POSITIVE_AMOUNT) feeAmount!: number;
  @ApiProperty({ enum: FEE_BEARERS }) feeBearer!: string;
  @ApiProperty(AMOUNT) netAmount!: number;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) bankAccountId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) momoTransactionId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date' }) scheduledDate!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) approvedByUserId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) approvedAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) paidAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) failureReason!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) proofDocumentId!: string | null;
}

export class PayoutPageDto {
  @ApiProperty({ type: [PayoutDto] }) items!: PayoutDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}
