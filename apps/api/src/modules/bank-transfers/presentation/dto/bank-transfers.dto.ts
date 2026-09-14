import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const AMOUNT = { type: 'integer', format: 'int64', minimum: 1, example: 300_000 } as const;

export class TransferDeclareDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() tenantId!: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() leaseId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() invoiceId?: string;
  @ApiProperty(AMOUNT) @Type(() => Number) @IsInt() @Min(1) declaredAmount!: number;
  @ApiProperty({ format: 'date' }) @IsISO8601({ strict: false }) transferDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) transferReference?: string;
  @ApiProperty({ example: 'Jean Mabiala' }) @IsString() @Length(2, 200) payerName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) payerBankCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) payerBankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) payerAccountNumber?: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() beneficiaryBankAccountId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() proofDocumentId!: string;
  @ApiProperty({ example: '01J8Z...ULID' }) @IsString() @Length(1, 64) clientRef!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class TransferApproveDto {
  @ApiPropertyOptional(AMOUNT)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  approvedAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class TransferReasonDto {
  @ApiProperty() @IsString() @Length(1, 500) reason!: string;
}

export class TransferListQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  from?: string;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601({ strict: false }) to?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() cursor?: string;
}
