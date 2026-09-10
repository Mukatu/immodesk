import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PageInfoDto, LandlordSummaryDto } from '../../../parties/presentation/dto/landlords.dto';
import { PROPERTY_TYPES, UNIT_STATUSES, UNIT_TYPES } from '../../domain/occupancy';
import { MAX_BULK_UNITS } from '../../domain/unit-code';

const PROPERTY_TYPE_VALUES = [...PROPERTY_TYPES];
const UNIT_TYPE_VALUES = [...UNIT_TYPES];
const UNIT_STATUS_VALUES = [...UNIT_STATUSES];

export class PropertyBodyDto {
  @ApiPropertyOptional({ example: 'RES-MPILA' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  code?: string;

  @ApiPropertyOptional({ enum: PROPERTY_TYPE_VALUES, default: 'HOUSE' })
  @IsOptional()
  @IsIn(PROPERTY_TYPE_VALUES)
  propertyType?: string;

  @ApiPropertyOptional({ example: '3e arrondissement' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  arrondissement?: string;

  @ApiPropertyOptional({
    example: "Derrière l'école Nganga Édouard",
    description: "Repère d'orientation : l'adressage postal local est peu fiable.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  landmark?: string;

  @ApiPropertyOptional({ default: 'Brazzaville' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional({ default: 'CG' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string;

  @ApiPropertyOptional({ example: -4.2634 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 15.2429 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) landTitleReference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) parcelNumber?: string;

  @ApiPropertyOptional({ example: 2014 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1800)
  @Max(2200)
  builtYear?: number;

  @ApiPropertyOptional({ example: 540.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAreaSqm?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200)
  floorsCount?: number;

  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() hasWater?: boolean;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() hasElectricity?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() hasBorehole?: boolean;

  @ApiPropertyOptional({ example: 'Papa Célestin' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  caretakerName?: string;

  @ApiPropertyOptional({ example: '066123456' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  caretakerPhone?: string;

  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() coverDocumentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class CreatePropertyDto extends PropertyBodyDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  landlordId!: string;

  @ApiProperty({ example: 'Résidence Mpila' })
  @IsString()
  @Length(2, 200)
  name!: string;

  @ApiProperty({ example: '45, avenue de la Corniche' })
  @IsString()
  @MaxLength(240)
  addressLine!: string;

  @ApiProperty({ example: 'Mpila', description: 'Quartier — adressage principal au Congo.' })
  @IsString()
  @MaxLength(120)
  district!: string;
}

export class UpdatePropertyDto extends PropertyBodyDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() landlordId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 200) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(240) addressLine?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) district?: string;
}

export class ListPropertiesQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) q?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() landlordId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) city?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(512) cursor?: string;
}

export class UnitBodyDto {
  @ApiPropertyOptional({ example: 'Studio rez-de-chaussée' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  label?: string;

  @ApiPropertyOptional({ enum: UNIT_TYPE_VALUES, default: 'APARTMENT' })
  @IsOptional()
  @IsIn(UNIT_TYPE_VALUES)
  unitType?: string;

  @ApiPropertyOptional({ enum: UNIT_STATUS_VALUES, default: 'AVAILABLE' })
  @IsOptional()
  @IsIn(UNIT_STATUS_VALUES)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-5)
  @Max(200)
  floorNumber?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  roomsCount?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  bedroomsCount?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  bathroomsCount?: number;
  @ApiPropertyOptional({ example: 42.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  areaSqm?: number;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() isFurnished?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() hasPrivateMeter?: boolean;

  @ApiPropertyOptional({
    type: 'integer',
    format: 'int64',
    example: 120000,
    description: 'Loyer de référence, entier XAF sans décimale.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  baseRentAmount?: number;

  @ApiPropertyOptional({
    type: 'integer',
    format: 'int64',
    example: 15000,
    description: 'Charges forfaitaires en XAF.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  baseChargesAmount?: number;

  @ApiPropertyOptional({ example: 2, description: 'Usage local : 2 à 3 mois de caution.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(12)
  depositMonths?: number;

  @ApiPropertyOptional({
    type: Object,
    example: { climatisation: true, cour: 'partagée', ventilateurs: 2 },
  })
  @IsOptional()
  @IsObject()
  amenities?: Record<string, unknown>;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class CreateUnitDto extends UnitBodyDto {
  @ApiProperty({ example: 'A1' })
  @IsString()
  @Length(1, 40)
  code!: string;
}

export class UpdateUnitDto extends UnitBodyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 40) code?: string;
}

export class BulkUnitsDto {
  @ApiProperty({ example: 'A', description: 'Préfixe des codes engendrés.' })
  @IsString()
  @MaxLength(20)
  prefix!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  from!: number;

  @ApiProperty({ example: 12, description: `Au plus ${MAX_BULK_UNITS} lots par appel.` })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  to!: number;

  @ApiPropertyOptional({ example: 2, description: '2 donne A01…A12 (tri alphabétique correct).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  padding?: number;

  @ApiProperty({ type: UnitBodyDto, description: 'Caractéristiques communes à tous les lots.' })
  @ValidateNested()
  @Type(() => UnitBodyDto)
  template!: UnitBodyDto;
}

export class ListUnitsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() propertyId?: string;
  @ApiPropertyOptional({ enum: UNIT_STATUS_VALUES })
  @IsOptional()
  @IsIn(UNIT_STATUS_VALUES)
  status?: string;
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

export class OccupancyDto {
  @ApiProperty({ example: 12 }) unitsCount!: number;
  @ApiProperty({ example: 4 }) occupiedCount!: number;
  @ApiProperty({ example: 8 }) availableCount!: number;
  @ApiProperty({ example: 3333, description: '100 % = 10 000 points de base.' })
  occupancyRateBps!: number;
}

export class PropertySummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ nullable: true, type: String }) code!: string | null;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: PROPERTY_TYPE_VALUES }) propertyType!: string;
  @ApiProperty() district!: string;
  @ApiProperty() city!: string;
  @ApiProperty({ type: LandlordSummaryDto }) landlord!: LandlordSummaryDto;
  @ApiProperty({ type: OccupancyDto }) occupancy!: OccupancyDto;
  @ApiProperty({ nullable: true, type: String }) coverDocumentId!: string | null;
}

export class PropertyPageDto {
  @ApiProperty({ type: [PropertySummaryDto] }) items!: PropertySummaryDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}
