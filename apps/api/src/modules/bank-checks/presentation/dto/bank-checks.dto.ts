import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsISO8601,
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
import { CHECK_STATUSES } from '../../domain/check-rules';

const AMOUNT = { type: 'integer', format: 'int64', minimum: 1, example: 150_000 } as const;

export class BankCheckReceiveDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() tenantId!: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() leaseId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() invoiceId?: string;
  @ApiProperty({ example: '0012345' }) @IsString() @Length(1, 40) checkNumber!: string;
  @ApiProperty({ example: 'Jean Mabiala' }) @IsString() @Length(2, 200) drawerName!: string;
  @ApiProperty({ example: 'BGFI' }) @IsString() @Length(1, 20) drawerBankCode!: string;
  @ApiProperty({ example: 'BGFIBank Congo' }) @IsString() @Length(1, 120) drawerBankName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) drawerAccountNumber?: string;
  @ApiProperty(AMOUNT) @Type(() => Number) @IsInt() @Min(1) amount!: number;
  @ApiProperty({ format: 'date' }) @IsISO8601({ strict: false }) issueDate!: string;
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601({ strict: false })
  receivedAt?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() imageDocumentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class BankCheckDepositDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() depositBankAccountId!: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  depositDate?: string;
}

export class BankCheckClearDto {
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  clearingDate?: string;
}

export class BankCheckBounceDto {
  // Optionnel au niveau DTO à dessein : le motif obligatoire est une règle
  // MÉTIER (`BANK.CHECK_REASON_REQUIRED`, 422), pas une validation de forme —
  // sinon un motif absent ne produirait qu'une 400 générique du pipe.
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string;
  @ApiPropertyOptional(AMOUNT)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  feeAmount?: number;
}

export class BankCheckReasonOptionalDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class BankCheckListQueryDto {
  @ApiPropertyOptional({ enum: CHECK_STATUSES })
  @IsOptional()
  @IsIn(CHECK_STATUSES as unknown as string[])
  status?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() tenantId?: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  dueBefore?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() cursor?: string;
}
