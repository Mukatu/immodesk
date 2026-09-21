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

/**
 * Mêmes champs que `TransferDeclareDto` (module `bank-transfers`), SANS
 * `tenantId` (imposé par le bail choisi, jamais par le client — contrat) et
 * avec `leaseId` OBLIGATOIRE (optionnel dans le DTO général, requis ici :
 * le locataire déclare toujours pour l'UN de ses baux) et
 * `proofDocumentId` OBLIGATOIRE (déjà le cas dans le DTO général, rappelé
 * ici par le contrat comme non négociable pour ce canal).
 */
export class TenantTransferDeclareDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() leaseId!: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() invoiceId?: string;
  @ApiProperty(AMOUNT) @Type(() => Number) @IsInt() @Min(1) declaredAmount!: number;
  @ApiProperty({ format: 'date' }) @IsISO8601({ strict: false }) transferDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) transferReference?: string;
  @ApiProperty({ example: 'Jean Mabiala' }) @IsString() @Length(2, 200) payerName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) payerBankCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) payerBankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) payerAccountNumber?: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() beneficiaryBankAccountId!: string;
  @ApiProperty({ format: 'uuid', description: 'Preuve obligatoire (contrat).' })
  @IsUUID()
  proofDocumentId!: string;
  @ApiProperty({ example: '01J8Z...ULID' }) @IsString() @Length(1, 64) clientRef!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class TenantTransferListQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Curseur opaque signé, issu de `pageInfo.nextCursor`.' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  cursor?: string;
}
