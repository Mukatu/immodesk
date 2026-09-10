import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { GENDERS, ID_DOCUMENT_TYPES, PARTY_TYPES, PAYMENT_METHODS } from '../../domain/party-rules';

const PARTY_TYPE_VALUES = [...PARTY_TYPES];
const GENDER_VALUES = [...GENDERS];
const ID_DOC_VALUES = [...ID_DOCUMENT_TYPES];
const PAYOUT_VALUES = [...PAYMENT_METHODS];

/** Champs d'identité communs au bailleur (création et mise à jour). */
export class LandlordBodyDto {
  @ApiPropertyOptional({ enum: PARTY_TYPE_VALUES, default: 'INDIVIDUAL' })
  @IsOptional()
  @IsIn(PARTY_TYPE_VALUES)
  partyType?: 'INDIVIDUAL' | 'COMPANY';

  @ApiPropertyOptional({ example: 'Célestin' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Nkodia',
    description: 'Obligatoire pour une personne physique (`PARTIES.NAME_REQUIRED`).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  lastName?: string;

  @ApiPropertyOptional({
    example: 'SCI Les Manguiers',
    description: 'Obligatoire pour une personne morale (`PARTIES.NAME_REQUIRED`).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional({ enum: GENDER_VALUES })
  @IsOptional()
  @IsIn(GENDER_VALUES)
  gender?: 'MALE' | 'FEMALE' | 'UNSPECIFIED';

  @ApiPropertyOptional({ example: '1972-04-18', format: 'date' })
  @IsOptional()
  @IsISO8601()
  birthDate?: string;

  @ApiPropertyOptional({ example: 'CG', minLength: 2, maxLength: 2 })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  nationality?: string;

  @ApiPropertyOptional({ enum: ID_DOC_VALUES })
  @IsOptional()
  @IsIn(ID_DOC_VALUES)
  idDocumentType?: string;

  @ApiPropertyOptional({ example: 'CG-1234567' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  idDocumentNumber?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601()
  idDocumentExpiry?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Pièce scannée dans `documents`.' })
  @IsOptional()
  @IsUUID()
  idDocumentId?: string;

  @ApiPropertyOptional({ example: 'CG-BZV-01-2019-B12-00045' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  rccmNumber?: string;

  @ApiPropertyOptional({ example: 'M2019110000123' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  niuNumber?: string;

  @ApiPropertyOptional({
    example: '066123456',
    description: 'Toute forme congolaise acceptée, normalisée en E.164 `+242…`.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  secondaryPhone?: string;

  @ApiPropertyOptional({ example: 'celestin.nkodia@example.cg' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '15, rue Mbochis' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  addressLine?: string;

  @ApiPropertyOptional({ example: 'Moungali', description: 'Quartier de Brazzaville.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  district?: string;

  @ApiPropertyOptional({ example: 'Brazzaville', default: 'Brazzaville' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional({ example: 'CG', default: 'CG' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  defaultBankAccountId?: string;

  @ApiPropertyOptional({ enum: PAYOUT_VALUES, default: 'MOBILE_MONEY' })
  @IsOptional()
  @IsIn(PAYOUT_VALUES)
  payoutMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CreateLandlordDto extends LandlordBodyDto {
  @ApiProperty({ example: '066123456', description: 'Normalisé en E.164 `+242…`.' })
  @IsString()
  @MaxLength(32)
  primaryPhone!: string;
}

export class UpdateLandlordDto extends LandlordBodyDto {
  @ApiPropertyOptional({ example: '+242066123456' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  primaryPhone?: string;
}

/** Filtres de `GET /v1/landlords`. */
export class ListLandlordsQueryDto {
  @ApiPropertyOptional({ description: 'Recherche insensible à la casse et aux accents.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({ example: 'Brazzaville' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Curseur opaque signé, issu de `pageInfo.nextCursor`.' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  cursor?: string;
}

export class PageInfoDto {
  @ApiProperty({ nullable: true, type: String }) nextCursor!: string | null;
  @ApiProperty() hasNextPage!: boolean;
  @ApiProperty() limit!: number;
}

export class LandlordSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'SCI Les Manguiers' }) displayName!: string;
  @ApiProperty({ example: '+242066123456' }) primaryPhone!: string;
  @ApiProperty() isSelf!: boolean;
}

export class LandlordDto extends LandlordSummaryDto {
  @ApiProperty({ enum: PARTY_TYPE_VALUES }) partyType!: string;
  @ApiProperty({ nullable: true, type: String }) firstName!: string | null;
  @ApiProperty({ nullable: true, type: String }) lastName!: string | null;
  @ApiProperty({ nullable: true, type: String }) companyName!: string | null;
  @ApiProperty({ enum: GENDER_VALUES }) gender!: string;
  @ApiProperty({ nullable: true, type: String }) birthDate!: string | null;
  @ApiProperty({ nullable: true, type: String }) nationality!: string | null;
  @ApiProperty({ nullable: true, type: String }) idDocumentType!: string | null;
  @ApiProperty({ nullable: true, type: String }) idDocumentNumber!: string | null;
  @ApiProperty({ nullable: true, type: String }) idDocumentExpiry!: string | null;
  @ApiProperty({ nullable: true, type: String }) idDocumentId!: string | null;
  @ApiProperty({ nullable: true, type: String }) rccmNumber!: string | null;
  @ApiProperty({ nullable: true, type: String }) niuNumber!: string | null;
  @ApiProperty({ nullable: true, type: String }) secondaryPhone!: string | null;
  @ApiProperty({ nullable: true, type: String }) email!: string | null;
  @ApiProperty({ nullable: true, type: String }) addressLine!: string | null;
  @ApiProperty({ nullable: true, type: String }) district!: string | null;
  @ApiProperty() city!: string;
  @ApiProperty() countryCode!: string;
  @ApiProperty({ nullable: true, type: String }) defaultBankAccountId!: string | null;
  @ApiProperty({ enum: PAYOUT_VALUES }) payoutMethod!: string;
  @ApiProperty({ nullable: true, type: String }) notes!: string | null;
  @ApiProperty({ example: 3 }) propertiesCount!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
  @ApiProperty({ nullable: true, type: String }) deletedAt!: string | null;
}

export class LandlordPageDto {
  @ApiProperty({ type: [LandlordDto] }) items!: LandlordDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}
