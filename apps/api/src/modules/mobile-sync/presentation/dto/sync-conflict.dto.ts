import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveConflictDto {
  @ApiProperty({ enum: ['APPLY', 'DISCARD'] })
  @IsIn(['APPLY', 'DISCARD'])
  decision!: 'APPLY' | 'DISCARD';

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Corrections facultatives, décision `APPLY` uniquement.',
  })
  @IsOptional()
  @IsObject()
  overrides?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Obligatoire pour la décision `DISCARD`.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class SyncConflictDto {
  @ApiProperty() id!: string;
  @ApiProperty() batchId!: string;
  @ApiProperty() clientRef!: string;
  @ApiProperty() type!: string;
  @ApiProperty() code!: string;
  @ApiProperty() message!: string;
  @ApiProperty({ type: 'object', additionalProperties: true }) payload!: unknown;
  @ApiProperty({ type: 'object', additionalProperties: true }) collector!: {
    userId: string;
    fullName: string;
  };
  @ApiProperty() deviceId!: string;
  @ApiProperty({ format: 'date-time' }) clientCreatedAt!: string;
  @ApiProperty({ format: 'date-time' }) receivedAt!: string;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) resolvedAt!: string | null;
  @ApiPropertyOptional({ enum: ['APPLIED', 'DISCARDED'], nullable: true }) resolution!:
    string | null;
  @ApiPropertyOptional({ nullable: true }) resolutionReason!: string | null;
}

export class SyncConflictPageDto {
  @ApiProperty({ type: [SyncConflictDto] }) items!: SyncConflictDto[];
  @ApiProperty({ type: 'object', additionalProperties: true }) pageInfo!: unknown;
}

export class ResolveConflictResponseDto {
  @ApiProperty({ type: SyncConflictDto }) conflict!: SyncConflictDto;
  @ApiProperty({ type: 'object', additionalProperties: true }) result!: unknown;
}
