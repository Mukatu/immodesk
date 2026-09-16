import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EXPENSE_BEARERS, EXPENSE_CATEGORIES } from '../../../expenses/domain/expense-rules';
import {
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_REPORTERS,
  MAINTENANCE_STATUSES,
} from '../../domain/maintenance-rules';

export class MaintenanceCreateDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() propertyId!: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() unitId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() leaseId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() tenantId?: string;
  @ApiPropertyOptional({ enum: MAINTENANCE_PRIORITIES, default: 'NORMAL' })
  @IsOptional()
  @IsIn(MAINTENANCE_PRIORITIES)
  priority?: string;
  @ApiPropertyOptional({ enum: MAINTENANCE_REPORTERS, default: 'MANAGER' })
  @IsOptional()
  @IsIn(MAINTENANCE_REPORTERS)
  reporterType?: string;
  @ApiPropertyOptional({ enum: EXPENSE_CATEGORIES, default: 'REPAIR' })
  @IsOptional()
  @IsIn(EXPENSE_CATEGORIES)
  category?: string;
  @ApiProperty({ example: 'Fuite robinetterie cuisine' })
  @IsString()
  @MaxLength(160)
  title!: string;
  @ApiProperty() @IsString() @MaxLength(2000) description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) locationDetail?: string;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() estimatedAmount?: number;
  @ApiPropertyOptional({ enum: EXPENSE_BEARERS, default: 'LANDLORD' })
  @IsOptional()
  @IsIn(EXPENSE_BEARERS)
  chargedTo?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() inspectionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) clientRef?: string;
}

export class MaintenanceUpdateInputDto {
  @ApiPropertyOptional({ enum: MAINTENANCE_STATUSES })
  @IsOptional()
  @IsIn(MAINTENANCE_STATUSES)
  newStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) message?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() photoDocumentId?: string;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() amountDelta?: number;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isVisibleToTenant?: boolean;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() expenseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) clientRef?: string;
}

export class MaintenanceAssignDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() assignedToUserId!: string;
}

export class MaintenanceRejectDto {
  @ApiProperty({ example: "Hors du périmètre de l'agence" })
  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class ListMaintenanceQueryDto {
  @ApiPropertyOptional({ enum: MAINTENANCE_STATUSES })
  @IsOptional()
  @IsIn(MAINTENANCE_STATUSES)
  status?: string;
  @ApiPropertyOptional({ enum: MAINTENANCE_PRIORITIES })
  @IsOptional()
  @IsIn(MAINTENANCE_PRIORITIES)
  priority?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() propertyId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() assignedToUserId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() overdueOnly?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(200) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() cursor?: string;
}
