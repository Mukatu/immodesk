import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Matches, Min } from 'class-validator';

export class ApproveCommissionsDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Limite la campagne à un partenaire.' })
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @ApiPropertyOptional({
    example: '2026-09',
    description: 'Mois d’imputation (AAAA-MM) ; par défaut le mois courant.',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  periodMonth?: string;
}

export class ApproveCommissionsResponseDto {
  @ApiProperty({ example: 3, description: 'Nombre de commissions passées APPROVED.' })
  approved!: number;
  @ApiProperty({
    example: 1,
    description: 'Nombre de commissions retenues par le plafond mensuel.',
  })
  heldByCap!: number;
}

export class CreatePayoutsDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Limite le versement à un partenaire.' })
  @IsOptional()
  @IsUUID()
  partnerId?: string;
}

export class CreatePayoutsResponseDto {
  @ApiProperty({ type: [String] }) payoutIds!: string[];
}

export class ReferralPayoutDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) partnerId!: string;
  @ApiProperty() periodStart!: string;
  @ApiProperty() periodEnd!: string;
  @ApiProperty({ example: '15000' }) totalAmount!: string;
  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED'] })
  status!: string;
  @ApiPropertyOptional({ nullable: true }) msisdn!: string | null;
  @ApiProperty() requestedAt!: string;
}

export class AtRiskQueryDto {
  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

export class AtRiskSubscriptionDto {
  @ApiProperty({ format: 'uuid' }) organizationId!: string;
  @ApiProperty() organizationName!: string;
  @ApiProperty({ enum: ['PAST_DUE'] }) status!: string;
}

export class AtRiskListDto {
  @ApiProperty({ type: [AtRiskSubscriptionDto] }) items!: AtRiskSubscriptionDto[];
  @ApiProperty() pageInfo!: { nextCursor: null; hasNextPage: boolean; limit: number };
}
