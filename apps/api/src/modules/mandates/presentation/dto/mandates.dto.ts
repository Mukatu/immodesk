import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LandlordSummaryDto, PageInfoDto } from '../../../parties/presentation/dto/landlords.dto';
import { PropertySummaryDto } from '../../../portfolio/presentation/dto/portfolio.dto';
import { COMMISSION_BASES, MANDATE_SCOPES, MANDATE_STATUSES } from '../../domain/mandate-rules';

const BPS = { type: 'integer', minimum: 0, maximum: 10_000 } as const;
const AMOUNT = { type: 'integer', format: 'int64', minimum: 0 } as const;

export class MandateInputDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() landlordId!: string;

  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  propertyIds!: string[];

  @ApiPropertyOptional({ enum: MANDATE_SCOPES }) @IsOptional() @IsIn(MANDATE_SCOPES) scope?: string;

  @ApiProperty({ format: 'date' }) @IsISO8601({ strict: false }) startDate!: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  endDate?: string;

  @ApiPropertyOptional({ minimum: 0, default: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  noticeDays?: number;

  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() autoRenew?: boolean;

  @ApiPropertyOptional({ enum: COMMISSION_BASES })
  @IsOptional()
  @IsIn(COMMISSION_BASES)
  commissionBasis?: string;

  @ApiPropertyOptional(BPS)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  commissionRateBps?: number;

  @ApiPropertyOptional(AMOUNT)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  commissionFlatAmount?: number;

  @ApiPropertyOptional(BPS)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  lettingFeeRateBps?: number;

  @ApiPropertyOptional(BPS)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  vatRateBps?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 28, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(28)
  payoutDay?: number;

  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() payoutBankAccountId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

/** `PATCH /{id}` : périmètre et commission uniquement (contrat, règle 6). */
export class MandateUpdateDto {
  @ApiPropertyOptional({ enum: MANDATE_SCOPES }) @IsOptional() @IsIn(MANDATE_SCOPES) scope?: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  endDate?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  noticeDays?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoRenew?: boolean;

  @ApiPropertyOptional({ enum: COMMISSION_BASES })
  @IsOptional()
  @IsIn(COMMISSION_BASES)
  commissionBasis?: string;

  @ApiPropertyOptional(BPS)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  commissionRateBps?: number;

  @ApiPropertyOptional(AMOUNT)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  commissionFlatAmount?: number;

  @ApiPropertyOptional(BPS)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  lettingFeeRateBps?: number;

  @ApiPropertyOptional(BPS)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  vatRateBps?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 28 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(28)
  payoutDay?: number;

  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() payoutBankAccountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class SuspendMandateDto {
  @ApiProperty({ example: 'Impayés répétés du bailleur envers le syndic.' })
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class TerminateMandateDto {
  @ApiProperty({ format: 'date' }) @IsISO8601({ strict: false }) effectiveDate!: string;
  @ApiProperty({ example: 'Reprise en gestion directe par le bailleur.' })
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class AttachPropertiesDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  propertyIds!: string[];
}

export class ListMandatesQueryDto {
  @ApiPropertyOptional({ enum: MANDATE_STATUSES })
  @IsOptional()
  @IsIn(MANDATE_STATUSES)
  status?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() landlordId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() propertyId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(512) cursor?: string;
}

export class MandateDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) landlordId!: string;
  @ApiProperty({ type: [String], format: 'uuid' }) propertyIds!: string[];
  @ApiProperty() reference!: string;
  @ApiProperty({ enum: MANDATE_SCOPES }) scope!: string;
  @ApiProperty({ enum: MANDATE_STATUSES }) status!: string;
  @ApiProperty({ format: 'date' }) startDate!: string;
  @ApiProperty({ nullable: true, type: String, format: 'date' }) endDate!: string | null;
  @ApiProperty() noticeDays!: number;
  @ApiProperty() autoRenew!: boolean;
  @ApiProperty({ enum: COMMISSION_BASES }) commissionBasis!: string;
  @ApiProperty({ ...BPS, nullable: true }) commissionRateBps!: number | null;
  @ApiProperty({ ...AMOUNT, nullable: true }) commissionFlatAmount!: number | null;
  @ApiProperty({ ...BPS, nullable: true }) lettingFeeRateBps!: number | null;
  @ApiProperty(BPS) vatRateBps!: number;
  @ApiProperty() payoutDay!: number;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) payoutBankAccountId!:
    string | null;
  @ApiProperty({ nullable: true, type: String }) notes!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) signedAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) terminatedAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) terminationReason!: string | null;
  @ApiProperty({ example: 'XAF' }) currency!: 'XAF';
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class MandateLandlordRefDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty() isDiaspora!: boolean;
}

export class MandateSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty({ enum: MANDATE_STATUSES }) status!: string;
  @ApiProperty({ type: MandateLandlordRefDto }) landlord!: MandateLandlordRefDto;
  @ApiProperty() propertiesCount!: number;
  @ApiProperty({ ...BPS, nullable: true }) commissionRateBps!: number | null;
  @ApiProperty({ format: 'date' }) startDate!: string;
  @ApiProperty({ nullable: true, type: String, format: 'date' }) endDate!: string | null;
}

export class MandatePageDto {
  @ApiProperty({ type: [MandateSummaryDto] }) items!: MandateSummaryDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}

export class LandlordPortalStatusDto {
  @ApiProperty() invited!: boolean;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) invitedAt!: string | null;
  @ApiProperty() activated!: boolean;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) userId!: string | null;
}

/** Résumé de relevé au sein d'une fiche de mandat : `owner-statements` en reste propriétaire. */
export class MandateStatementRefDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() statementNumber!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ format: 'date' }) periodStart!: string;
  @ApiProperty({ format: 'date' }) periodEnd!: string;
  @ApiProperty(AMOUNT) rentCollectedAmount!: number;
  @ApiProperty(AMOUNT) commissionAmount!: number;
  @ApiProperty(AMOUNT) expensesAmount!: number;
  @ApiProperty({ type: 'integer', format: 'int64' }) carryForwardAmount!: number;
  @ApiProperty({ type: 'integer', format: 'int64' }) netPayableAmount!: number;
}

export class MandateDetailDto extends MandateDto {
  @ApiProperty({ type: LandlordSummaryDto }) landlord!: LandlordSummaryDto;
  @ApiProperty({ type: [PropertySummaryDto] }) properties!: PropertySummaryDto[];
  @ApiProperty({ type: [MandateStatementRefDto] }) statements!: MandateStatementRefDto[];
  @ApiProperty({ type: LandlordPortalStatusDto }) landlordPortal!: LandlordPortalStatusDto;
}

export class LandlordInvitationResponseDto {
  @ApiProperty({ format: 'uuid' }) notificationId!: string;
  @ApiProperty({ example: 'SENT' }) invitationStatus!: 'SENT';
}
