import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LINE_STATES } from '../../domain/line-state';

const IMPLEMENTED_FORMATS = ['CSV', 'MT940'] as const;

export class ImportStatementDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() documentId!: string;
  @ApiPropertyOptional({ enum: IMPLEMENTED_FORMATS })
  @IsOptional()
  @IsIn([...IMPLEMENTED_FORMATS])
  format?: 'CSV' | 'MT940';
}

export class PageQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() cursor?: string;
}

export class StatementLinesQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: LINE_STATES }) @IsOptional() @IsIn([...LINE_STATES]) state?: string;
}

export class GlobalLinesQueryDto extends StatementLinesQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() bankAccountId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) olderThanDays?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) minAmount?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) q?: string;
}

export class PatchStatementLineDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isIgnored?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) ignoreReason?: string;
}

export class DiscardStatementDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 500) reason?: string;
}
