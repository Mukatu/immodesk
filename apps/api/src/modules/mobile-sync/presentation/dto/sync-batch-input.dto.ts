import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { SYNC_OPERATION_TYPES, type SyncOperationType } from '../../domain/sync-types';

export class SyncOperationInputDto {
  @ApiProperty({ description: 'ULID généré sur l’appareil, unique par organisation.' })
  @IsString()
  @Length(1, 64)
  clientRef!: string;

  @ApiProperty({ enum: SYNC_OPERATION_TYPES })
  @IsIn(SYNC_OPERATION_TYPES as unknown as string[])
  type!: SyncOperationType;

  @ApiProperty({ format: 'date-time', description: 'Horodatage local, informatif.' })
  @IsISO8601({ strict: false })
  clientCreatedAt!: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'clientRef d’opérations du même lot à appliquer avant.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  dependsOn?: string[];

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Corps identique à la route en ligne.',
  })
  @IsObject()
  payload!: unknown;
}

export class SyncBatchInputDto {
  @ApiProperty({ description: 'ULID du lot, unique par appareil.' })
  @IsString()
  @Length(1, 64)
  batchRef!: string;

  @ApiProperty({ description: 'Identifiant stable de l’appareil.' })
  @IsString()
  @Length(1, 128)
  deviceId!: string;

  @ApiPropertyOptional({ example: 'android' })
  @IsOptional()
  @IsString()
  @Length(1, 32)
  devicePlatform?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 32) appVersion?: string;
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601({ strict: false })
  clientGeneratedAt?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offlineDurationMinutes?: number;

  @ApiProperty({ type: [SyncOperationInputDto], minItems: 1, maxItems: 200 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SyncOperationInputDto)
  operations!: SyncOperationInputDto[];
}
