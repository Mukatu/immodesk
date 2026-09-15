import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PageInfoDto } from '../../../parties/presentation/dto/landlords.dto';

const AMOUNT = { type: 'integer', format: 'int64' } as const;

export class PortalPageQueryDto {
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

export class PortalCollectionsQueryDto extends PortalPageQueryDto {
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  from?: string;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601({ strict: false }) to?: string;
}

export class PortalLandlordDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty() primaryPhone!: string;
  @ApiProperty({ nullable: true, type: String }) email!: string | null;
  @ApiProperty() isDiaspora!: boolean;
  @ApiProperty() payoutMethod!: string;
}

export class PortalOrganizationDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
}

export class PortalMeDto {
  @ApiProperty({ type: PortalLandlordDto }) landlord!: PortalLandlordDto;
  @ApiProperty({ type: [PortalOrganizationDto] }) organizations!: PortalOrganizationDto[];
}

export class DownloadUrlDto {
  @ApiProperty() downloadUrl!: string;
  @ApiProperty() expiresAt!: string;
}

/**
 * `Payout` réduit au portail (contrat, § Types) : le bailleur n'a pas besoin
 * de voir `approvedByUserId`, `bankAccountId` ou `momoTransactionId` — des
 * détails opérationnels internes à l'agence. Écart au contrat documenté dans
 * le rapport de livraison.
 */
export class PortalPayoutDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() status!: string;
  @ApiProperty() method!: string;
  @ApiProperty(AMOUNT) amount!: number;
  @ApiProperty(AMOUNT) netAmount!: number;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) paidAt!: string | null;
}

export class PortalPayoutPageDto {
  @ApiProperty({ type: [PortalPayoutDto] }) items!: PortalPayoutDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}

class PortalTenantRefDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() displayName!: string;
}

class PortalUnitRefDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() code!: string;
}

export class PortalCollectionDto {
  @ApiProperty({ format: 'uuid' }) paymentId!: string;
  @ApiProperty({ format: 'date' }) paymentDate!: string;
  @ApiProperty() method!: string;
  @ApiProperty(AMOUNT) amount!: number;
  @ApiProperty({ type: PortalTenantRefDto }) tenant!: PortalTenantRefDto;
  @ApiProperty({ type: PortalUnitRefDto }) unit!: PortalUnitRefDto;
  @ApiProperty({ nullable: true, type: String }) invoiceNumber!: string | null;
}

export class PortalCollectionPageDto {
  @ApiProperty({ type: [PortalCollectionDto] }) items!: PortalCollectionDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}

export class PortalReceiptDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() receiptNumber!: string;
  @ApiProperty({ format: 'date' }) issueDate!: string;
  @ApiProperty(AMOUNT) amount!: number;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) documentId!: string | null;
}

export class PortalReceiptPageDto {
  @ApiProperty({ type: [PortalReceiptDto] }) items!: PortalReceiptDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}
