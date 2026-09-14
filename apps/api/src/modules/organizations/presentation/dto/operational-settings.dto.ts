import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const CHANNELS = ['WHATSAPP', 'SMS'] as const;

/** Paramètres de facturation (`settings_json.billing`). */
export class BillingSettingsDto {
  @ApiProperty({ example: 5, description: 'Émission J-N avant l’échéance.' })
  generateDaysBefore!: number;
  @ApiProperty({ example: true, description: 'ISSUED directement, sinon DRAFT.' })
  autoIssue!: boolean;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) defaultPenaltyRuleId!:
    string | null;
  @ApiProperty({ example: false }) applyPenalties!: boolean;
}

/** Paramètres de caisse (`settings_json.cash`). */
export class CashSettingsDto {
  @ApiProperty({ type: 'integer', format: 'int64', example: 500_000 })
  collectorHoldingCapAmount!: number;
  @ApiProperty({ example: true }) requireTenantSignature!: boolean;
  @ApiProperty({ example: false }) denominationsEnabled!: boolean;
}

/** Paramètres de messagerie (`settings_json.messaging`). */
export class MessagingSettingsDto {
  @ApiProperty({ enum: CHANNELS, isArray: true, example: ['WHATSAPP', 'SMS'] })
  receiptChannelOrder!: string[];

  @ApiProperty({ example: true }) sendCashReceiptToTenant!: boolean;
  @ApiProperty({ example: true }) sendInvoiceIssued!: boolean;
}

export class UpdateBillingSettingsDto {
  @ApiPropertyOptional({ minimum: 0, maximum: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  generateDaysBefore?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoIssue?: boolean;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsUUID()
  defaultPenaltyRuleId?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() applyPenalties?: boolean;
}

export class UpdateCashSettingsDto {
  @ApiPropertyOptional({ type: 'integer', format: 'int64', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  collectorHoldingCapAmount?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireTenantSignature?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() denominationsEnabled?: boolean;
}

export class UpdateMessagingSettingsDto {
  @ApiPropertyOptional({ enum: CHANNELS, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsIn([...CHANNELS], { each: true })
  receiptChannelOrder?: Array<'WHATSAPP' | 'SMS'>;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() sendCashReceiptToTenant?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sendInvoiceIssued?: boolean;
}

/** Classes imbriquées exposées pour `@ValidateNested`. */
export const NESTED_SETTINGS_TYPES = {
  billing: () => UpdateBillingSettingsDto,
  cash: () => UpdateCashSettingsDto,
  messaging: () => UpdateMessagingSettingsDto,
};

const AGGREGATOR_PROVIDERS = ['SIMULATOR', 'CINETPAY'] as const;
const FEE_BEARERS = ['TENANT', 'ORGANIZATION'] as const;

/** `settings_json.paymentMethods` (phase 4). */
export class MobileMoneyDeclaredSettingsDto {
  @ApiProperty({ example: true }) enabled!: boolean;
}

export class MobileMoneyAggregatorSettingsDto {
  @ApiProperty({ example: false }) enabled!: boolean;
  @ApiProperty({ enum: AGGREGATOR_PROVIDERS, example: 'SIMULATOR' })
  provider!: (typeof AGGREGATOR_PROVIDERS)[number];
  @ApiProperty({ enum: FEE_BEARERS, example: 'TENANT' }) feeBearer!: (typeof FEE_BEARERS)[number];
  @ApiProperty({ example: 300, description: 'Points de base (1/100 %).' }) feeRateBps!: number;
  @ApiProperty({ example: 500 }) minAmount!: number;
  @ApiProperty({ example: 2_000_000 }) maxAmount!: number;
}

export class BankTransferSettingsDto {
  @ApiProperty({ example: true }) enabled!: boolean;
  @ApiProperty({ example: true }) confirmOnApproval!: boolean;
}

export class PaymentMethodsSettingsDto {
  @ApiProperty({ type: MobileMoneyDeclaredSettingsDto })
  mobileMoneyDeclared!: MobileMoneyDeclaredSettingsDto;
  @ApiProperty({ type: MobileMoneyAggregatorSettingsDto })
  mobileMoneyAggregator!: MobileMoneyAggregatorSettingsDto;
  @ApiProperty({ type: BankTransferSettingsDto }) bankTransfer!: BankTransferSettingsDto;
  @ApiProperty({ example: 120 }) pendingExpiryMinutes!: number;
  @ApiProperty({
    example: false,
    description:
      'Vrai seulement si le drapeau plateforme `payments.mobile_money_aggregator` est actif.',
  })
  aggregatorAvailable!: boolean;
}

export class UpdateMobileMoneyDeclaredSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean;
}

export class UpdateMobileMoneyAggregatorSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean;
  @ApiPropertyOptional({ enum: AGGREGATOR_PROVIDERS })
  @IsOptional()
  @IsIn(AGGREGATOR_PROVIDERS)
  provider?: (typeof AGGREGATOR_PROVIDERS)[number];
  @ApiPropertyOptional({ enum: FEE_BEARERS })
  @IsOptional()
  @IsIn(FEE_BEARERS)
  feeBearer?: (typeof FEE_BEARERS)[number];
  @ApiPropertyOptional({ minimum: 0, maximum: 10_000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  feeRateBps?: number;
  @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @IsInt() @Min(0) minAmount?: number;
  @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @IsInt() @Min(0) maxAmount?: number;
}

export class UpdateBankTransferSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() confirmOnApproval?: boolean;
}

export class UpdatePaymentMethodsSettingsDto {
  @ApiPropertyOptional({ type: UpdateMobileMoneyDeclaredSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateMobileMoneyDeclaredSettingsDto)
  mobileMoneyDeclared?: UpdateMobileMoneyDeclaredSettingsDto;

  @ApiPropertyOptional({ type: UpdateMobileMoneyAggregatorSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateMobileMoneyAggregatorSettingsDto)
  mobileMoneyAggregator?: UpdateMobileMoneyAggregatorSettingsDto;

  @ApiPropertyOptional({ type: UpdateBankTransferSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateBankTransferSettingsDto)
  bankTransfer?: UpdateBankTransferSettingsDto;

  @ApiPropertyOptional({ minimum: 5, maximum: 10_080 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(10_080)
  pendingExpiryMinutes?: number;
}

export { Type };
