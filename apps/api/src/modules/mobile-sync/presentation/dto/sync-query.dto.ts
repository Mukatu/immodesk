import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { toBoolean } from '../../../billing/presentation/dto/billing.dto';

export class ListSyncBatchesQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() collectorUserId?: string;
  @ApiPropertyOptional({
    enum: ['RECEIVED', 'VALIDATING', 'APPLIED', 'PARTIALLY_APPLIED', 'REJECTED', 'FAILED'],
  })
  @IsOptional()
  @IsIn(['RECEIVED', 'VALIDATING', 'APPLIED', 'PARTIALLY_APPLIED', 'REJECTED', 'FAILED'])
  status?: string;
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601({ strict: false })
  from?: string;
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601({ strict: false })
  to?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() cursor?: string;
}

export class SyncPullQueryDto {
  @ApiPropertyOptional({
    description: 'Curseur signé renvoyé par un appel précédent (`nextCursor`).',
  })
  @IsOptional()
  @IsString()
  since?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;
}

export class ListSyncConflictsQueryDto {
  @ApiPropertyOptional() @IsOptional() @Transform(toBoolean) @IsBoolean() resolved?: boolean;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() collectorUserId?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() cursor?: string;
}
