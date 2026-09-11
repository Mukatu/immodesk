import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
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
import { DEPOSIT_MOVEMENT_TYPES, DEPOSIT_STATUSES } from '../../../deposits/domain/deposit-rules';
import { LEASE_DOCUMENT_KINDS, LEASE_PARTY_ROLES } from '../../domain/lease-status';

const ROLE_VALUES = [...LEASE_PARTY_ROLES];
const DOCUMENT_KIND_VALUES = [...LEASE_DOCUMENT_KINDS];
const MOVEMENT_TYPE_VALUES = [...DEPOSIT_MOVEMENT_TYPES];
const DEPOSIT_STATUS_VALUES = [...DEPOSIT_STATUSES];

export class ActivateLeaseDto {
  @ApiPropertyOptional({ format: 'date', description: "Défaut : la date d'effet du bail." })
  @IsOptional()
  @IsISO8601({ strict: false })
  moveInDate?: string;
}

export class CancelLeaseDto {
  @ApiProperty({ example: 'Dossier du locataire incomplet' })
  @IsString()
  @Length(3, 500)
  reason!: string;
}

export class LeaseEffectDto {
  @ApiProperty({ format: 'date', example: '2026-07-31' })
  @IsISO8601({ strict: false })
  effectiveDate!: string;

  @ApiProperty({ example: 'Départ du locataire' })
  @IsString()
  @Length(3, 500)
  reason!: string;
}

export class CreateRentRevisionDto {
  @ApiProperty({ format: 'date', example: '2027-01-01' })
  @IsISO8601({ strict: false })
  effectiveDate!: string;

  @ApiProperty({ type: 'integer', format: 'int64', example: 165_000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  newRentAmount!: number;

  @ApiPropertyOptional({ type: 'integer', format: 'int64', example: 15_000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  newChargesAmount?: number;

  @ApiPropertyOptional({ example: 'Révision annuelle contractuelle' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Avenant signé justifiant la révision.' })
  @IsOptional()
  @IsUUID()
  documentId?: string;
}

export class RentAtQueryDto {
  @ApiProperty({ format: 'date', example: '2027-03-15' })
  @IsISO8601({ strict: false })
  date!: string;
}

export class CreateLeasePartyDto {
  @ApiProperty({ enum: ROLE_VALUES }) @IsIn(ROLE_VALUES) role!: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() tenantId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() guarantorId?: string;

  @ApiPropertyOptional({ default: 10_000, description: '100 % = 10 000 points de base.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  shareBps?: number;

  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isSolidary?: boolean;
}

export class UpdateLeasePartyDto {
  @ApiPropertyOptional({ minimum: 0, maximum: 10_000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  shareBps?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isSolidary?: boolean;
}

export class AttachLeaseDocumentDto {
  @ApiProperty({ format: 'uuid', description: 'Document déjà téléversé via `/documents`.' })
  @IsUUID()
  documentId!: string;

  @ApiProperty({ enum: DOCUMENT_KIND_VALUES }) @IsIn(DOCUMENT_KIND_VALUES) kind!: string;

  @ApiProperty({ example: 'Contrat signé scanné' })
  @IsString()
  @Length(2, 200)
  title!: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  effectiveDate?: string;

  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() isSigned?: boolean;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601({ strict: true })
  signedAt?: string;
}

export class GenerateContractDto {
  @ApiPropertyOptional({
    default: false,
    description:
      'Force une nouvelle version. Sans ce drapeau, la dernière version déjà produite est rendue telle quelle.',
  })
  @IsOptional()
  @IsBoolean()
  regenerate?: boolean;
}

export class CreateDepositMovementDto {
  @ApiProperty({ enum: MOVEMENT_TYPE_VALUES }) @IsIn(MOVEMENT_TYPE_VALUES) movementType!: string;

  @ApiProperty({ type: 'integer', format: 'int64', example: 150_000, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  movementDate?: string;

  @ApiPropertyOptional({ example: 'Encaissement du 1er mois de caution' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() paymentId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() inspectionId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Mouvement annulé par cette écriture.' })
  @IsOptional()
  @IsUUID()
  reversalOfId?: string;
}

export class ListDepositsQueryDto {
  @ApiPropertyOptional({ enum: DEPOSIT_STATUS_VALUES })
  @IsOptional()
  @IsIn(DEPOSIT_STATUS_VALUES)
  status?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  refundDueBefore?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(512) cursor?: string;
}
