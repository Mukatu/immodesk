import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';
import { MATCH_TARGET_TYPES } from '../../domain/match-target';

const AMOUNT = { type: 'integer', format: 'int64', minimum: 1, example: 150_000 } as const;

export class CreateMatchDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() statementLineId!: string;
  @ApiProperty({ enum: MATCH_TARGET_TYPES }) @IsIn([...MATCH_TARGET_TYPES]) targetType!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() targetId!: string;
  @ApiProperty(AMOUNT) @Type(() => Number) @IsInt() @Min(1) matchedAmount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 500) reason?: string;
}

export class MatchReasonDto {
  @ApiProperty({ example: 'Virement d’un autre locataire' })
  @IsString()
  @Length(3, 500)
  reason!: string;
}

export class DashboardQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() bankAccountId?: string;
}
