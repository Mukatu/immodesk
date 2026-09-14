import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const AMOUNT = { type: 'integer', format: 'int64', minimum: 1, example: 50_000 } as const;
const DECLARED_PROVIDERS = ['MTN_MOMO', 'AIRTEL_MONEY'] as const;

export class MomoDeclareDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() tenantId!: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() leaseId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() invoiceId?: string;
  @ApiProperty({ enum: DECLARED_PROVIDERS })
  @IsIn(DECLARED_PROVIDERS)
  provider!: (typeof DECLARED_PROVIDERS)[number];
  @ApiProperty({ example: 'MP260911.1234.A56789' })
  @IsString()
  @Length(3, 120)
  operatorReference!: string;
  @ApiProperty({ example: '+242066000001' }) @IsString() payerMsisdn!: string;
  @ApiProperty({ example: '+242066000099' }) @IsString() payeeMsisdn!: string;
  @ApiProperty(AMOUNT) @Type(() => Number) @IsInt() @Min(1) amount!: number;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() proofDocumentId?: string;
  @ApiProperty({ example: '01J8Z...ULID' }) @IsString() @Length(1, 64) clientRef!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class MomoApproveDto {
  @ApiPropertyOptional(AMOUNT)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  approvedAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class MomoReasonDto {
  @ApiProperty() @IsString() @Length(1, 500) reason!: string;
}

export class MomoQuoteDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() invoiceId?: string;
  @ApiProperty(AMOUNT) @Type(() => Number) @IsInt() @Min(1) amount!: number;
}

export class MomoInitiateDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() invoiceId?: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() tenantId!: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() leaseId?: string;
  @ApiProperty(AMOUNT) @Type(() => Number) @IsInt() @Min(1) amount!: number;
  @ApiProperty({ example: '+242066000001' }) @IsString() payerMsisdn!: string;
  @ApiProperty({ example: '01J8Z...ULID' }) @IsString() @Length(1, 64) clientRef!: string;
}

export class MomoListQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() channel?: string;
  @ApiPropertyOptional({ format: 'date-time' }) @IsOptional() @IsISO8601() from?: string;
  @ApiPropertyOptional({ format: 'date-time' }) @IsOptional() @IsISO8601() to?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() cursor?: string;
}
