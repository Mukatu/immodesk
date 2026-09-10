import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
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
import { GENDERS, ID_DOCUMENT_TYPES, PARTY_TYPES } from '../../domain/party-rules';
import { PageInfoDto } from './landlords.dto';

const PARTY_TYPE_VALUES = [...PARTY_TYPES];
const GENDER_VALUES = [...GENDERS];
const ID_DOC_VALUES = [...ID_DOCUMENT_TYPES];

export class TenantBodyDto {
  @ApiPropertyOptional({ enum: PARTY_TYPE_VALUES, default: 'INDIVIDUAL' })
  @IsOptional()
  @IsIn(PARTY_TYPE_VALUES)
  partyType?: 'INDIVIDUAL' | 'COMPANY';

  @ApiPropertyOptional({ example: 'Bernadette' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Loemba' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  lastName?: string;

  @ApiPropertyOptional({ example: 'Ets Congo Négoce' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional({ enum: GENDER_VALUES })
  @IsOptional()
  @IsIn(GENDER_VALUES)
  gender?: 'MALE' | 'FEMALE' | 'UNSPECIFIED';

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601()
  birthDate?: string;

  @ApiPropertyOptional({ example: 'Pointe-Noire' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  birthPlace?: string;

  @ApiPropertyOptional({ example: 'CG' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  nationality?: string;

  @ApiPropertyOptional({ enum: ID_DOC_VALUES })
  @IsOptional()
  @IsIn(ID_DOC_VALUES)
  idDocumentType?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) idDocumentNumber?: string;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601() idDocumentExpiry?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() idDocumentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) rccmNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) niuNumber?: string;

  @ApiPropertyOptional({ example: 'Institutrice' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  profession?: string;

  @ApiPropertyOptional({ example: 'Lycée de la Révolution' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  employerName?: string;

  @ApiPropertyOptional({
    type: 'integer',
    format: 'int64',
    example: 350000,
    description: 'Revenu mensuel déclaré, entier XAF sans décimale.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  monthlyIncome?: number;

  @ApiPropertyOptional({ example: '066123456' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  secondaryPhone?: string;

  @ApiPropertyOptional({ example: '066123456' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  whatsappPhone?: string;

  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(240) addressLine?: string;

  @ApiPropertyOptional({ example: 'Poto-Poto' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  district?: string;

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

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) emergencyContactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32) emergencyContactPhone?: string;

  @ApiPropertyOptional({ description: "ULID de l'appareil mobile, clé d'idempotence." })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientRef?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class CreateTenantDto extends TenantBodyDto {
  @ApiProperty({ example: '066123456' })
  @IsString()
  @MaxLength(32)
  primaryPhone!: string;

  @ApiPropertyOptional({
    description:
      'Confirme sciemment un numéro déjà utilisé par un autre locataire (foyer partagé). ' +
      'Sans lui, la création répond 409 `PARTIES.PHONE_ALREADY_USED`.',
  })
  @IsOptional()
  @IsBoolean()
  confirmDuplicatePhone?: boolean;
}

export class UpdateTenantDto extends TenantBodyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32) primaryPhone?: string;
}

export class ListTenantsQueryDto {
  @ApiPropertyOptional({ description: 'Nom, raison sociale ou téléphone normalisé.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(512) cursor?: string;
}

export class GuarantorBodyDto {
  @ApiPropertyOptional({ enum: PARTY_TYPE_VALUES, default: 'INDIVIDUAL' })
  @IsOptional()
  @IsIn(PARTY_TYPE_VALUES)
  partyType?: 'INDIVIDUAL' | 'COMPANY';

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) companyName?: string;

  @ApiPropertyOptional({ example: 'Frère aîné' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  relationship?: string;

  @ApiPropertyOptional({ enum: ID_DOC_VALUES })
  @IsOptional()
  @IsIn(ID_DOC_VALUES)
  idDocumentType?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) idDocumentNumber?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() idDocumentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) profession?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) employerName?: string;

  @ApiPropertyOptional({ type: 'integer', format: 'int64', example: 600000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  monthlyIncome?: number;

  @ApiPropertyOptional({
    type: 'integer',
    format: 'int64',
    example: 1800000,
    description: 'Plafond de caution en XAF.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  guaranteeAmount?: number;

  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(240) addressLine?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) district?: string;
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
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class CreateGuarantorDto extends GuarantorBodyDto {
  @ApiProperty({ example: '066123456' })
  @IsString()
  @MaxLength(32)
  primaryPhone!: string;
}

export class UpdateGuarantorDto extends GuarantorBodyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32) primaryPhone?: string;
}

export class TenantDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: PARTY_TYPE_VALUES }) partyType!: string;
  @ApiProperty({ example: 'Bernadette Loemba' }) displayName!: string;
  @ApiProperty({ nullable: true, type: String }) firstName!: string | null;
  @ApiProperty({ nullable: true, type: String }) lastName!: string | null;
  @ApiProperty({ nullable: true, type: String }) companyName!: string | null;
  @ApiProperty({ enum: GENDER_VALUES }) gender!: string;
  @ApiProperty({ nullable: true, type: String }) birthDate!: string | null;
  @ApiProperty({ nullable: true, type: String }) birthPlace!: string | null;
  @ApiProperty({ nullable: true, type: String }) nationality!: string | null;
  @ApiProperty({ nullable: true, type: String }) idDocumentType!: string | null;
  @ApiProperty({ nullable: true, type: String }) idDocumentNumber!: string | null;
  @ApiProperty({ nullable: true, type: String }) idDocumentExpiry!: string | null;
  @ApiProperty({ nullable: true, type: String }) idDocumentId!: string | null;
  @ApiProperty({ nullable: true, type: String }) rccmNumber!: string | null;
  @ApiProperty({ nullable: true, type: String }) niuNumber!: string | null;
  @ApiProperty({ nullable: true, type: String }) profession!: string | null;
  @ApiProperty({ nullable: true, type: String }) employerName!: string | null;
  @ApiProperty({
    nullable: true,
    type: 'integer',
    format: 'int64',
    example: 280000,
    description: 'Entier XAF, sans décimale — le franc CFA n’a pas de sous-unité.',
  })
  monthlyIncome!: number | null;
  @ApiProperty({ enum: ['XAF'] }) currency!: string;
  @ApiProperty() primaryPhone!: string;
  @ApiProperty({ nullable: true, type: String }) secondaryPhone!: string | null;
  @ApiProperty({ nullable: true, type: String }) whatsappPhone!: string | null;
  @ApiProperty({ nullable: true, type: String }) email!: string | null;
  @ApiProperty({ nullable: true, type: String }) addressLine!: string | null;
  @ApiProperty({ nullable: true, type: String }) district!: string | null;
  @ApiProperty() city!: string;
  @ApiProperty() countryCode!: string;
  @ApiProperty({ nullable: true, type: String }) emergencyContactName!: string | null;
  @ApiProperty({ nullable: true, type: String }) emergencyContactPhone!: string | null;
  @ApiProperty({ nullable: true, type: String }) clientRef!: string | null;
  @ApiProperty({ nullable: true, type: String }) notes!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
  @ApiProperty({ nullable: true, type: String }) deletedAt!: string | null;
}

export class TenantPageDto {
  @ApiProperty({ type: [TenantDto] }) items!: TenantDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}

export class GuarantorDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) tenantId!: string | null;
  @ApiProperty({ enum: PARTY_TYPE_VALUES }) partyType!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({ nullable: true, type: String }) firstName!: string | null;
  @ApiProperty({ nullable: true, type: String }) lastName!: string | null;
  @ApiProperty({ nullable: true, type: String }) companyName!: string | null;
  @ApiProperty({ nullable: true, type: String }) relationship!: string | null;
  @ApiProperty({ nullable: true, type: String }) idDocumentType!: string | null;
  @ApiProperty({ nullable: true, type: String }) idDocumentNumber!: string | null;
  @ApiProperty({ nullable: true, type: String }) idDocumentId!: string | null;
  @ApiProperty({ nullable: true, type: String }) profession!: string | null;
  @ApiProperty({ nullable: true, type: String }) employerName!: string | null;
  @ApiProperty({ nullable: true, type: 'integer', format: 'int64', example: 600000 })
  monthlyIncome!: number | null;

  @ApiProperty({ nullable: true, type: 'integer', format: 'int64', example: 1800000 })
  guaranteeAmount!: number | null;
  @ApiProperty({ enum: ['XAF'] }) currency!: string;
  @ApiProperty() primaryPhone!: string;
  @ApiProperty({ nullable: true, type: String }) email!: string | null;
  @ApiProperty({ nullable: true, type: String }) addressLine!: string | null;
  @ApiProperty({ nullable: true, type: String }) district!: string | null;
  @ApiProperty() city!: string;
  @ApiProperty() countryCode!: string;
  @ApiProperty({ nullable: true, type: String }) notes!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
  @ApiProperty({ nullable: true, type: String }) deletedAt!: string | null;
}
