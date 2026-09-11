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

export { Type };
