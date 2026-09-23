import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class ApiKeySummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: 'imk_a1b2c3d4' }) keyPrefix!: string;
  @ApiProperty({ type: [String] }) scopes!: string[];
  @ApiProperty({ type: [String], nullable: true }) allowedIps!: string[] | null;
  @ApiProperty({ enum: ['ACTIVE', 'REVOKED'] }) status!: 'ACTIVE' | 'REVOKED';
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) lastUsedAt!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) expiresAt!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class ApiKeyListDto {
  @ApiProperty({ type: [ApiKeySummaryDto] }) items!: ApiKeySummaryDto[];
}

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Export comptable Sage' })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiPropertyOptional({ type: [String], example: ['payments:read'] })
  @IsOptional()
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  scopes?: string[];

  @ApiPropertyOptional({ type: [String], example: ['41.79.0.0/16'] })
  @IsOptional()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  allowedIps?: string[];

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601({ strict: false })
  expiresAt?: string;
}

export class ApiKeyCreatedResponseDto {
  @ApiProperty({ type: ApiKeySummaryDto }) apiKey!: ApiKeySummaryDto;
  @ApiProperty({ description: 'Secret rendu une seule fois, jamais relisible ensuite.' })
  secret!: string;
}

export class ApiKeyRotatedResponseDto extends ApiKeyCreatedResponseDto {
  @ApiProperty({ format: 'date-time' }) previousKeyExpiresAt!: string;
}
