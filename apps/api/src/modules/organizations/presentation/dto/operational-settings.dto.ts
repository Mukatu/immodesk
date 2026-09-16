import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
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

/** Paramètres de rapprochement bancaire/chèques (`settings_json.reconciliation`, phase 6). */
export class ReconciliationSettingsDto {
  @ApiProperty({ example: 75, minimum: 50, maximum: 95 }) suggestionThreshold!: number;
  @ApiProperty({ example: 15 }) dateWindowDays!: number;
  @ApiProperty({ example: 2 }) amountTolerancePercent!: number;
  @ApiProperty({ example: true }) autoConfirmExact!: boolean;
  @ApiProperty({ example: 15 }) checkClearingAlertDays!: number;
  @ApiProperty({ example: 0 }) bounceFeeAmount!: number;
}

export class UpdateReconciliationSettingsDto {
  @ApiPropertyOptional({ minimum: 50, maximum: 95 })
  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(95)
  suggestionThreshold?: number;

  @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @IsInt() @Min(0) dateWindowDays?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountTolerancePercent?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoConfirmExact?: boolean;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  checkClearingAlertDays?: number;

  @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @IsInt() @Min(0) bounceFeeAmount?: number;
}

const PHOTO_REQUIRED_FROM = ['POOR', 'DAMAGED'] as const;

/** `settings_json.facilities` (phase 8, états des lieux/compteurs/maintenance). */
export class MaintenanceSlaHoursDto {
  @ApiProperty({ example: 4 }) URGENT!: number;
  @ApiProperty({ example: 24 }) HIGH!: number;
  @ApiProperty({ example: 120 }) NORMAL!: number;
  @ApiProperty({ example: 360 }) LOW!: number;
}

export class FacilitiesSettingsDto {
  @ApiProperty({ example: false }) utilityFallbackFlat!: boolean;
  @ApiProperty({ example: 3, minimum: 1, maximum: 28 }) utilityRunDayOfMonth!: number;
  @ApiProperty({ enum: PHOTO_REQUIRED_FROM, example: 'POOR' })
  inspectionPhotoRequiredFrom!: (typeof PHOTO_REQUIRED_FROM)[number];
  @ApiProperty({ type: MaintenanceSlaHoursDto }) maintenanceSlaHours!: MaintenanceSlaHoursDto;
  @ApiProperty({ example: false }) autoCreateMaintenanceFromInspection!: boolean;
}

export class UpdateMaintenanceSlaHoursDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 8760 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8760)
  URGENT?: number;
  @ApiPropertyOptional({ minimum: 1, maximum: 8760 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8760)
  HIGH?: number;
  @ApiPropertyOptional({ minimum: 1, maximum: 8760 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8760)
  NORMAL?: number;
  @ApiPropertyOptional({ minimum: 1, maximum: 8760 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8760)
  LOW?: number;
}

export class UpdateFacilitiesSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() utilityFallbackFlat?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 28 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  utilityRunDayOfMonth?: number;

  @ApiPropertyOptional({ enum: PHOTO_REQUIRED_FROM })
  @IsOptional()
  @IsIn(PHOTO_REQUIRED_FROM)
  inspectionPhotoRequiredFrom?: (typeof PHOTO_REQUIRED_FROM)[number];

  @ApiPropertyOptional({ type: UpdateMaintenanceSlaHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateMaintenanceSlaHoursDto)
  maintenanceSlaHours?: UpdateMaintenanceSlaHoursDto;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoCreateMaintenanceFromInspection?: boolean;
}

/** Classes imbriquées exposées pour `@ValidateNested`. */
export const NESTED_SETTINGS_TYPES = {
  billing: () => UpdateBillingSettingsDto,
  cash: () => UpdateCashSettingsDto,
  messaging: () => UpdateMessagingSettingsDto,
  reconciliation: () => UpdateReconciliationSettingsDto,
  facilities: () => UpdateFacilitiesSettingsDto,
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
