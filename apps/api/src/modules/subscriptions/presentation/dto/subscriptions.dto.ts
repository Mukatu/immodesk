import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

/** `invoice_status` réellement produits pour un abonnement (arbitrage 2 du contrat). */
export const SUBSCRIPTION_INVOICE_STATUSES = ['ISSUED', 'PAID', 'OVERDUE', 'CANCELLED'] as const;

/** `+242XXXXXXXXX` : E.164 congolais, la normalisation fine reste au domaine. */
const MSISDN_PATTERN = /^\+?[0-9]{8,15}$/;

export class SubscribeDto {
  @ApiProperty({ example: 'STARTER' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  planCode!: string;

  @ApiPropertyOptional({ example: '+242066123456' })
  @IsOptional()
  @IsString()
  @Matches(MSISDN_PATTERN)
  momoMsisdn?: string;
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class PaySubscriptionInvoiceDto {
  @ApiPropertyOptional({
    example: '+242066123456',
    description: 'Par défaut, le numéro Mobile Money déjà enregistré sur l’abonnement.',
  })
  @IsOptional()
  @IsString()
  @Matches(MSISDN_PATTERN)
  payerMsisdn?: string;
}

export class ListSubscriptionInvoicesQueryDto {
  @ApiPropertyOptional({ enum: SUBSCRIPTION_INVOICE_STATUSES })
  @IsOptional()
  @IsIn([...SUBSCRIPTION_INVOICE_STATUSES])
  status?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() cursor?: string;
}
