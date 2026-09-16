import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { TARIFF_BASES } from '../../domain/tariff-engine';

const METER_TYPES = ['ELECTRICITY_E2C', 'WATER_LCDE', 'GAS', 'PRIVATE_SUBMETER', 'SOLAR', 'OTHER'];
const LINE_TYPES = ['WATER_CHARGE', 'ELECTRICITY_CHARGE'];

export class UtilityTariffInputDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() propertyId?: string;
  @ApiProperty({ enum: METER_TYPES }) @IsIn(METER_TYPES) meterType!: string;
  @ApiPropertyOptional({ enum: TARIFF_BASES }) @IsOptional() @IsIn(TARIFF_BASES) basis?: string;
  @ApiProperty({ example: 'Eau LCDE — tarif résidentiel' })
  @IsString()
  @MaxLength(120)
  label!: string;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() unitPriceAmount?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() flatAmount?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() standingChargeAmount?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() minimumAmount?: number;
  @ApiPropertyOptional({ default: 'kWh' }) @IsOptional() @IsString() measurementUnit?: string;
  @ApiPropertyOptional({ enum: LINE_TYPES })
  @IsOptional()
  @IsIn(LINE_TYPES)
  invoiceLineType?: string;
  @ApiProperty({ format: 'date' }) @IsISO8601() effectiveFrom!: string;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601() effectiveTo?: string;
}

export class UtilityTariffUpdateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) label?: string;
  @ApiPropertyOptional() @IsOptional() unitPriceAmount?: number;
  @ApiPropertyOptional() @IsOptional() flatAmount?: number;
  @ApiPropertyOptional() @IsOptional() standingChargeAmount?: number;
  @ApiPropertyOptional() @IsOptional() minimumAmount?: number;
  @ApiPropertyOptional({ format: 'date', nullable: true })
  @IsOptional()
  @IsISO8601()
  effectiveTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UtilityTariffDto extends UtilityTariffInputDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ enum: ['XAF'] }) currency!: 'XAF';
}

export class ListUtilityTariffsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() propertyId?: string;
  @ApiPropertyOptional({ enum: METER_TYPES }) @IsOptional() @IsIn(METER_TYPES) meterType?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() activeOnly?: boolean;
}

export class UtilityRunInputDto {
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601() periodStart?: string;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601() periodEnd?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() propertyId?: string;
}

export class UtilityRunAcceptedDto {
  @ApiProperty({ format: 'uuid' }) runId!: string;
}

export class SkippedLotDto {
  @ApiProperty({ format: 'uuid' }) meterId!: string;
  @ApiProperty({ nullable: true, type: String }) unitId!: string | null;
  @ApiProperty() reason!: string;
}

export class UtilityRunStatusDto {
  @ApiProperty() status!: string;
  @ApiProperty() created!: number;
  @ApiProperty({ type: [SkippedLotDto] }) skipped!: SkippedLotDto[];
  @ApiProperty({ type: [Object] }) errors!: Array<{ meterId: string; message: string }>;
}
