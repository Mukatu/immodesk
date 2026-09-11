import { ApiProperty } from '@nestjs/swagger';
import { PageInfoDto } from '../../../parties/presentation/dto/landlords.dto';
import { DEPOSIT_STATUSES } from '../../domain/deposit-rules';

const AMOUNT = { type: 'integer', format: 'int64', example: 300_000 } as const;

export class DepositTenantRefDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'Bernadette Loemba' }) displayName!: string;
}

export class DepositUnitRefDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'A1' }) code!: string;
}

export class DepositSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) leaseId!: string;
  @ApiProperty({ nullable: true, type: String }) leaseReference!: string | null;
  @ApiProperty({ type: DepositTenantRefDto }) tenant!: DepositTenantRefDto;
  @ApiProperty({ type: DepositUnitRefDto }) unit!: DepositUnitRefDto;
  @ApiProperty({ enum: [...DEPOSIT_STATUSES] }) status!: string;
  @ApiProperty(AMOUNT) requiredAmount!: number;
  @ApiProperty({ ...AMOUNT, example: 150_000 }) heldAmount!: number;
  @ApiProperty({ nullable: true, type: String }) refundDueDate!: string | null;
}

export class DepositPageDto {
  @ApiProperty({ type: [DepositSummaryDto] }) items!: DepositSummaryDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}

export class DepositsOverviewDto {
  @ApiProperty({ ...AMOUNT, description: 'Total encore détenu par l’organisation.' })
  heldTotal!: number;

  @ApiProperty({
    ...AMOUNT,
    example: 150_000,
    description: 'Reste à encaisser : somme de `required − collected`, jamais négative.',
  })
  pendingTotal!: number;

  @ApiProperty({ example: 2, description: 'Dépôts à restituer et encore détenus.' })
  refundDueCount!: number;

  @ApiProperty({
    type: Object,
    example: {
      PENDING: 1,
      PARTIALLY_PAID: 1,
      HELD: 4,
      PARTIALLY_REFUNDED: 0,
      REFUNDED: 2,
      FORFEITED: 0,
    },
  })
  byStatus!: Record<string, number>;
}
