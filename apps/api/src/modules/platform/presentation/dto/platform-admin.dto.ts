import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsISO8601,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { ReadOnlyStateDto } from './platform-public.dto';

export class SetReadOnlyModeDto {
  @ApiProperty() @IsBoolean() enabled!: boolean;
  @ApiPropertyOptional({ description: 'Obligatoire à l’activation.' })
  @IsOptional()
  @IsString()
  reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() expectedEndAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() incidentRef?: string;
}

export class ReadOnlyStateResponseDto extends ReadOnlyStateDto {}

export class FeatureFlagQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() key?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() organizationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() cursor?: string;
}

export class UpdateFeatureFlagBodyDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Absent : drapeau global.' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) rolloutPercentage?: number;
  @ApiPropertyOptional({ type: Object }) @IsOptional() @IsObject() payload?: Record<
    string,
    unknown
  >;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() startsAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() endsAt?: string;
}

export class GoLiveBoardQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() wave?: string;
  @ApiPropertyOptional({ enum: ['MIGRATED', 'PENDING', 'ANOMALY'] })
  @IsOptional()
  @IsIn(['MIGRATED', 'PENDING', 'ANOMALY'])
  status?: 'MIGRATED' | 'PENDING' | 'ANOMALY';
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() cursor?: string;
}

export class ActivateWaveBodyDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @IsUUID('4', { each: true })
  organizationIds!: string[];
}

export class DeclareIncidentBodyDto {
  @ApiProperty() @IsString() @MinLength(3) title!: string;
  @ApiProperty({ enum: ['MINOR', 'MAJOR', 'CRITICAL'] })
  @IsIn(['MINOR', 'MAJOR', 'CRITICAL'])
  severity!: 'MINOR' | 'MAJOR' | 'CRITICAL';
}

export class AddIncidentUpdateBodyDto {
  @ApiProperty() @IsString() @MinLength(1) message!: string;
}

export class PageInfoDto {
  @ApiPropertyOptional({ nullable: true }) nextCursor!: string | null;
  @ApiProperty() hasNextPage!: boolean;
  @ApiProperty() limit!: number;
}

export class FeatureFlagDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() key!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) organizationId!: string | null;
  @ApiProperty() isEnabled!: boolean;
  @ApiProperty() rolloutPercentage!: number;
  @ApiProperty({ type: Object }) payload!: Record<string, unknown>;
  @ApiPropertyOptional({ nullable: true }) startsAt!: string | null;
  @ApiPropertyOptional({ nullable: true }) endsAt!: string | null;
  @ApiProperty() updatedAt!: string;
}

export class FeatureFlagListResponseDto {
  @ApiProperty({ type: [FeatureFlagDto] }) items!: FeatureFlagDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}

export class UpdateFeatureFlagResponseDto {
  @ApiProperty() updated!: boolean;
  @ApiProperty({ type: [FeatureFlagDto] }) items!: FeatureFlagDto[];
}

export class ActivateWaveResponseDto {
  @ApiProperty() wave!: string;
  @ApiProperty() activated!: number;
  @ApiProperty() skipped!: number;
  @ApiProperty() notified!: number;
}

export class RollbackWaveResponseDto {
  @ApiProperty() wave!: string;
  @ApiProperty() reverted!: number;
}

export class GoLiveBoardItemDto {
  @ApiProperty({ format: 'uuid' }) organizationId!: string;
  @ApiProperty() legalName!: string;
  @ApiPropertyOptional({ nullable: true }) wave!: string | null;
  @ApiProperty({ enum: ['MIGRATED', 'PENDING', 'ANOMALY'] }) status!:
    'MIGRATED' | 'PENDING' | 'ANOMALY';
  @ApiPropertyOptional({ nullable: true }) activatedAt!: string | null;
  @ApiPropertyOptional({ nullable: true }) subscriptionStatus!: string | null;
  @ApiProperty({ type: [String] }) anomalies!: string[];
}

export class GoLiveBoardCountsDto {
  @ApiProperty() migrated!: number;
  @ApiProperty() pending!: number;
  @ApiProperty() anomaly!: number;
}

export class GoLiveBoardDto {
  @ApiPropertyOptional({ nullable: true }) wave!: string | null;
  @ApiProperty({ type: GoLiveBoardCountsDto }) counts!: GoLiveBoardCountsDto;
  @ApiProperty({ type: [GoLiveBoardItemDto] }) items!: GoLiveBoardItemDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}
