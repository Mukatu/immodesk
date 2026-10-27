import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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
import { PageInfoDto } from '../../../parties/presentation/dto/landlords.dto';

const AUDIT_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'STATE_TRANSITION',
  'LOGIN',
  'EXPORT',
  'IMPORT',
  'ACCESS_DENIED',
];

export class AccessDenialDto {
  @ApiProperty({ format: 'date-time' }) occurredAt!: string;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) actorUserId!: string | null;
  @ApiProperty({ nullable: true, type: String }) actorLabel!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) apiKeyId!: string | null;
  @ApiProperty({ nullable: true, type: String }) ipAddress!: string | null;
  @ApiProperty() method!: string;
  @ApiProperty() path!: string;
  @ApiProperty({ example: 'IAM.FORBIDDEN' }) code!: string;
  @ApiProperty() entityType!: string;
  @ApiProperty({ format: 'uuid' }) entityId!: string;
  @ApiProperty({ nullable: true, type: String }) requestId!: string | null;
}

export class AccessDenialPageDto {
  @ApiProperty({ type: [AccessDenialDto] }) items!: AccessDenialDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}

export class ListAccessDenialsQueryDto {
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601({ strict: false })
  from?: string;
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601({ strict: false })
  to?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() userId?: string;
  @ApiPropertyOptional({ example: 'IAM.FORBIDDEN' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  code?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(512) cursor?: string;
}

export class AuditLogEntryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'date-time' }) occurredAt!: string;
  @ApiProperty({ enum: AUDIT_ACTIONS }) action!: string;
  @ApiProperty() operation!: string;
  @ApiProperty() entityType!: string;
  @ApiProperty({ format: 'uuid' }) entityId!: string;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) actorUserId!: string | null;
  @ApiProperty({ nullable: true, type: String }) actorLabel!: string | null;
  @ApiProperty({ nullable: true, type: String }) actorRole!: string | null;
  @ApiProperty({ type: Object, nullable: true }) previousState!: Record<string, unknown> | null;
  @ApiProperty({ type: Object, nullable: true }) newState!: Record<string, unknown> | null;
  @ApiProperty({ type: [String] }) changedFields!: string[];
  @ApiProperty({ nullable: true, type: String }) ipAddress!: string | null;
  @ApiProperty({ nullable: true, type: String }) requestId!: string | null;
}

export class AuditLogPageDto {
  @ApiProperty({ type: [AuditLogEntryDto] }) items!: AuditLogEntryDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}

export class ListAuditLogsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() actorUserId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) entityType?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() entityId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) operation?: string;
  @ApiPropertyOptional({ enum: AUDIT_ACTIONS }) @IsOptional() @IsIn(AUDIT_ACTIONS) action?: string;
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601({ strict: false })
  from?: string;
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601({ strict: false })
  to?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(512) cursor?: string;
}
