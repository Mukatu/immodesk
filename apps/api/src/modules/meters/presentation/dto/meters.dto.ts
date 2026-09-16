import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PageInfoDto } from '../../../parties/presentation/dto/landlords.dto';
import { METER_TYPES } from '../../domain/meter-rules';

export class MeterInputDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() propertyId!: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() unitId?: string;
  @ApiProperty({ enum: METER_TYPES }) @IsIn(METER_TYPES) meterType!: (typeof METER_TYPES)[number];
  @ApiProperty({ example: 'E2C-00458123' }) @IsString() @MaxLength(60) serialNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) subscriberNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) providerName?: string;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() isPrepaid?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() isShared?: boolean;
  @ApiPropertyOptional({ minimum: 0, maximum: 10_000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sharedRatioBps?: number;
  @ApiPropertyOptional({ default: 'kWh' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  measurementUnit?: string;
  @ApiPropertyOptional({ default: 6, minimum: 3, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(10)
  digitsCount?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsNumber() initialIndex?: number;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() tariffId?: string;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601() installedAt?: string;
}

export class MeterUpdateDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) @IsOptional() unitId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) subscriberNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) providerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrepaid?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isShared?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(10_000) sharedRatioBps?: number;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) @IsOptional() tariffId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class MeterDto extends MeterInputDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ nullable: true, type: Object }) lastReading!: {
    readingDate: string;
    currentIndex: number;
  } | null;
}

export class MeterPageDto {
  @ApiProperty({ type: [MeterDto] }) items!: MeterDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}

export class ListMetersQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() propertyId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() unitId?: string;
  @ApiPropertyOptional({ enum: METER_TYPES }) @IsOptional() @IsIn(METER_TYPES) meterType?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(200) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() cursor?: string;
}

export class MeterReadingInputDto {
  @ApiProperty({ format: 'date' }) @IsISO8601() readingDate!: string;
  @ApiProperty({ example: 1258.5 }) @IsNumber() currentIndex!: number;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601() periodStart?: string;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601() periodEnd?: string;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() rolloverApplied?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() isEstimated?: boolean;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() photoDocumentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @ApiProperty() @IsString() @MaxLength(80) clientRef!: string;
}

export class MeterReadingDto extends MeterReadingInputDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) meterId!: string;
  @ApiProperty({ nullable: true, type: String }) unitId!: string | null;
  @ApiProperty({ nullable: true, type: String }) leaseId!: string | null;
  @ApiProperty() previousIndex!: number;
  @ApiProperty() consumption!: number;
  @ApiProperty({ nullable: true, type: String }) tariffId!: string | null;
  @ApiProperty() unitPriceAmount!: number;
  @ApiProperty() computedAmount!: number;
  @ApiProperty() isInvoiced!: boolean;
  @ApiProperty({ nullable: true, type: String }) invoiceLineId!: string | null;
  @ApiProperty({ nullable: true, type: String }) recordedByUserId!: string | null;
}

export class MeterReadingPageDto {
  @ApiProperty({ type: [MeterReadingDto] }) items!: MeterReadingDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
  @ApiProperty({ type: [Number] }) consumptionSeries!: number[];
}

export class ListReadingsQueryDto {
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601() from?: string;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601() to?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(200) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() cursor?: string;
}
