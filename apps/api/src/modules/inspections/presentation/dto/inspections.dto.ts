import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EXPENSE_BEARERS } from '../../../expenses/domain/expense-rules';
import {
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_REPORTERS,
} from '../../../maintenance/domain/maintenance-rules';
import {
  INSPECTION_CONDITIONS,
  INSPECTION_STATUSES,
  INSPECTION_TYPES,
} from '../../domain/inspection-rules';

export class InspectionCreateDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() unitId!: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() leaseId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() tenantId?: string;
  @ApiProperty({ enum: INSPECTION_TYPES }) @IsIn(INSPECTION_TYPES) inspectionType!: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() scheduledAt?: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() tenantPresent?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() landlordPresent?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) keysHandedCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) clientRef?: string;
}

export class InspectionUpdateDto {
  @ApiPropertyOptional() @IsOptional() @IsISO8601() scheduledAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() tenantPresent?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() landlordPresent?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) keysHandedCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class InspectionItemInputDto {
  @ApiProperty({ example: 'Salon' }) @IsString() @MaxLength(80) roomLabel!: string;
  @ApiProperty({ example: 'Peinture murale' }) @IsString() @MaxLength(120) elementLabel!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) elementCategory?: string;
  @ApiProperty({ enum: INSPECTION_CONDITIONS }) @IsIn(INSPECTION_CONDITIONS) condition!: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsInt() @Min(0) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDamaged?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) damageDescription?: string;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() repairAmount?: number;
  @ApiPropertyOptional({ enum: EXPENSE_BEARERS, default: 'TENANT' })
  @IsOptional()
  @IsIn(EXPENSE_BEARERS)
  chargedTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) position?: number;
}

export class InspectionItemUpdateDto extends InspectionItemInputDto {}

export class InspectionPhotoInputDto {
  @ApiProperty({ format: 'uuid', description: 'Document déjà téléversé via /documents' })
  @IsUUID()
  documentId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) caption?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() takenAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() checksumSha256?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) position?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) clientRef?: string;
}

export class SignInputDto {
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() tenantPresent?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) absenceReason?: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  tenantSignatureDocumentId?: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  agentSignatureDocumentId?: string;
}

export class DisputeDto {
  @ApiProperty() @IsString() @MaxLength(1000) reason!: string;
}

export class DepositDeductionDto {
  @ApiPropertyOptional() @IsOptional() amount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() managerOverride?: boolean;
}

export class MaintenanceConversionDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() managerOverride?: boolean;
  @ApiPropertyOptional({ enum: MAINTENANCE_PRIORITIES })
  @IsOptional()
  @IsIn(MAINTENANCE_PRIORITIES)
  priority?: string;
  @ApiPropertyOptional({ enum: MAINTENANCE_REPORTERS })
  @IsOptional()
  @IsIn(MAINTENANCE_REPORTERS)
  reporterType?: string;
}

export class ListInspectionsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() unitId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() leaseId?: string;
  @ApiPropertyOptional({ enum: INSPECTION_TYPES })
  @IsOptional()
  @IsIn(INSPECTION_TYPES)
  type?: string;
  @ApiPropertyOptional({ enum: INSPECTION_STATUSES })
  @IsOptional()
  @IsIn(INSPECTION_STATUSES)
  status?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(200) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() cursor?: string;
}
