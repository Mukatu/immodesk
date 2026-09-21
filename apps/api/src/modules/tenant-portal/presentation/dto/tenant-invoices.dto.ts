import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import { INVOICE_STATUSES } from '../../../billing/domain/invoice-status';

export class TenantInvoiceListQueryDto {
  @ApiPropertyOptional({ enum: INVOICE_STATUSES })
  @IsOptional()
  @IsIn(INVOICE_STATUSES)
  status?: string;

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

export class TenantInvoicePayDto {
  @ApiProperty({
    example: '+242066000001',
    description: 'Numéro Mobile Money du locataire, normalisé en E.164.',
  })
  @IsString()
  @MaxLength(24)
  payerMsisdn!: string;

  @ApiProperty({ example: '01J8Z...ULID', description: "Clé d'idempotence côté client." })
  @IsString()
  @Length(1, 64)
  clientRef!: string;
}

export class TenantInvoicePayResponseDto {
  @ApiProperty({ format: 'uuid' }) transactionId!: string;
  @ApiProperty() status!: string;
}
