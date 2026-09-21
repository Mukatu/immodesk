import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class AttachReferralCodeDto {
  @ApiProperty({ example: 'IMD-4K7QRT' })
  @IsString()
  @Length(10, 10)
  code!: string;
}

export class ReferralDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) partnerId!: string;
  @ApiProperty({ format: 'uuid' }) referredOrganizationId!: string;
  @ApiPropertyOptional({ nullable: true }) referredPropertyId!: string | null;
  @ApiProperty({ enum: ['CODE_AT_SIGNUP', 'PARTNER_REGISTERED_PROPERTY', 'LINK', 'MANUAL_ADMIN'] })
  source!: string;
  @ApiProperty({ enum: ['PENDING', 'QUALIFIED', 'ACTIVE', 'EXPIRED', 'CANCELLED'] })
  status!: string;
  @ApiPropertyOptional({ nullable: true }) qualifiedAt!: string | null;
  @ApiPropertyOptional({ nullable: true }) activatedAt!: string | null;
  @ApiPropertyOptional({ nullable: true }) expiresAt!: string | null;
  @ApiProperty() createdAt!: string;
}

export class PageInfoDto {
  @ApiPropertyOptional({ nullable: true }) nextCursor!: string | null;
  @ApiProperty() hasNextPage!: boolean;
  @ApiProperty() limit!: number;
}

export class ReferralListDto {
  @ApiProperty({ type: [ReferralDto] }) items!: ReferralDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}

export class ReferralCommissionDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) referralId!: string;
  @ApiProperty({ example: '10000' }) baseAmount!: string;
  @ApiProperty({ example: 2000 }) rateBps!: number;
  @ApiProperty({ example: '2000' }) commissionAmount!: string;
  @ApiProperty({ enum: ['ACCRUED', 'APPROVED', 'PAID', 'REVERSED', 'CANCELLED'] })
  status!: string;
  @ApiPropertyOptional({ nullable: true }) periodMonth!: string | null;
  @ApiProperty() accruedAt!: string;
  @ApiPropertyOptional({ nullable: true }) reversalOfId!: string | null;
}

export class ReferralCommissionTotalsDto {
  @ApiProperty({ example: '0' }) ACCRUED!: string;
  @ApiProperty({ example: '0' }) APPROVED!: string;
  @ApiProperty({ example: '0' }) PAID!: string;
  @ApiProperty({ example: '0' }) REVERSED!: string;
  @ApiProperty({ example: '0' }) CANCELLED!: string;
}

export class ReferralCommissionListDto {
  @ApiProperty({ type: [ReferralCommissionDto] }) items!: ReferralCommissionDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
  @ApiProperty({ type: ReferralCommissionTotalsDto }) totals!: ReferralCommissionTotalsDto;
}

/** Pagination simple par curseur opaque (dernier `id` vu). */
export class CursorQueryDto {
  @ApiPropertyOptional({ example: 20 }) limit?: number;
  @ApiPropertyOptional() cursor?: string;
}
