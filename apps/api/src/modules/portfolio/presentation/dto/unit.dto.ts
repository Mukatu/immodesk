import { ApiProperty } from '@nestjs/swagger';
import { PageInfoDto } from '../../../parties/presentation/dto/landlords.dto';
import { PROPERTY_TYPES, UNIT_STATUSES, UNIT_TYPES } from '../../domain/occupancy';
import { OccupancyDto, PropertySummaryDto } from './portfolio.dto';

const PROPERTY_TYPE_VALUES = [...PROPERTY_TYPES];
const UNIT_TYPE_VALUES = [...UNIT_TYPES];
const UNIT_STATUS_VALUES = [...UNIT_STATUSES];

export class UnitDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) propertyId!: string;
  @ApiProperty({ example: 'A1' }) code!: string;
  @ApiProperty({ nullable: true, type: String }) label!: string | null;
  @ApiProperty({ enum: UNIT_TYPE_VALUES }) unitType!: string;
  @ApiProperty({ enum: UNIT_STATUS_VALUES }) status!: string;
  @ApiProperty({ nullable: true, type: Number }) floorNumber!: number | null;
  @ApiProperty({ nullable: true, type: Number }) roomsCount!: number | null;
  @ApiProperty({ nullable: true, type: Number }) bedroomsCount!: number | null;
  @ApiProperty({ nullable: true, type: Number }) bathroomsCount!: number | null;
  @ApiProperty({ nullable: true, type: Number }) areaSqm!: number | null;
  @ApiProperty() isFurnished!: boolean;
  @ApiProperty() hasPrivateMeter!: boolean;
  @ApiProperty({
    type: 'integer',
    format: 'int64',
    example: 120000,
    description: 'Loyer de référence en XAF, entier sans décimale.',
  })
  baseRentAmount!: number;

  @ApiProperty({
    type: 'integer',
    format: 'int64',
    example: 15000,
    description: 'Charges forfaitaires en XAF, entier sans décimale.',
  })
  baseChargesAmount!: number;
  @ApiProperty({ example: 2 }) depositMonths!: number;
  @ApiProperty({ enum: ['XAF'] }) currency!: string;
  @ApiProperty({ type: Object }) amenities!: Record<string, unknown>;
  @ApiProperty({ nullable: true, type: String }) notes!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
  @ApiProperty({ nullable: true, type: String }) deletedAt!: string | null;
}

export class UnitPageDto {
  @ApiProperty({ type: [UnitDto] }) items!: UnitDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}

export class BulkUnitsResultDto {
  @ApiProperty({ type: [UnitDto] }) created!: UnitDto[];
}

export class PropertyDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) landlordId!: string;
  @ApiProperty({ nullable: true, type: String }) code!: string | null;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: PROPERTY_TYPE_VALUES }) propertyType!: string;
  @ApiProperty() addressLine!: string;
  @ApiProperty() district!: string;
  @ApiProperty({ nullable: true, type: String }) arrondissement!: string | null;
  @ApiProperty({ nullable: true, type: String }) landmark!: string | null;
  @ApiProperty() city!: string;
  @ApiProperty() countryCode!: string;
  @ApiProperty({ nullable: true, type: Number }) latitude!: number | null;
  @ApiProperty({ nullable: true, type: Number }) longitude!: number | null;
  @ApiProperty({ nullable: true, type: String }) landTitleReference!: string | null;
  @ApiProperty({ nullable: true, type: String }) parcelNumber!: string | null;
  @ApiProperty({ nullable: true, type: Number }) builtYear!: number | null;
  @ApiProperty({ nullable: true, type: Number }) totalAreaSqm!: number | null;
  @ApiProperty({ nullable: true, type: Number }) floorsCount!: number | null;
  @ApiProperty({ example: 12 }) unitsCount!: number;
  @ApiProperty() hasWater!: boolean;
  @ApiProperty() hasElectricity!: boolean;
  @ApiProperty() hasBorehole!: boolean;
  @ApiProperty({ nullable: true, type: String }) caretakerName!: string | null;
  @ApiProperty({ nullable: true, type: String }) caretakerPhone!: string | null;
  @ApiProperty({ nullable: true, type: String }) coverDocumentId!: string | null;
  @ApiProperty({ nullable: true, type: String }) notes!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
  @ApiProperty({ nullable: true, type: String }) deletedAt!: string | null;
}

/** `GET /v1/properties/{id}` : immeuble, bailleur, lots et occupation. */
export class PropertyDetailDto extends PropertyDto {
  @ApiProperty({ type: PropertySummaryDto }) summary!: PropertySummaryDto;
  @ApiProperty({ type: [UnitDto] }) units!: UnitDto[];
  @ApiProperty({ type: OccupancyDto }) occupancy!: OccupancyDto;
}

/** `GET /v1/units/{id}` : lot, son immeuble et ses pièces jointes. */
export class UnitDetailDto extends UnitDto {
  @ApiProperty({ type: PropertySummaryDto }) property!: PropertySummaryDto;
  @ApiProperty({ type: Object, isArray: true }) documents!: unknown[];
}
