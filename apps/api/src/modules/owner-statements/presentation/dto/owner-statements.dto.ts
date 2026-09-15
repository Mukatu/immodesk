import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PageInfoDto } from '../../../parties/presentation/dto/landlords.dto';
import { OWNER_STATEMENT_LINE_TYPES, STATEMENT_STATUSES } from '../../domain/owner-statement-rules';

const AMOUNT = { type: 'integer', format: 'int64', example: 450_000 } as const;
const POSITIVE_AMOUNT = { ...AMOUNT, minimum: 0 } as const;

export class ListOwnerStatementsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() landlordId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() mandateId?: string;
  @ApiPropertyOptional({ example: '2026-08', description: 'AAAA-MM' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  period?: string;
  @ApiPropertyOptional({ enum: STATEMENT_STATUSES })
  @IsOptional()
  @IsIn(STATEMENT_STATUSES)
  status?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(512) cursor?: string;
}

export class StartOwnerStatementRunDto {
  @ApiPropertyOptional({
    example: '2026-08',
    description: 'AAAA-MM ; par défaut le mois civil précédent.',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  period?: string;
}

export class CancelStatementDto {
  @ApiProperty({ example: 'Erreur de périmètre, régénération demandée.' })
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class RunStartedDto {
  @ApiProperty({ format: 'uuid' }) runId!: string;
}

export class RunErrorDto {
  @ApiProperty() mandateId!: string;
  @ApiProperty() reason!: string;
}

export class RunStatusDto {
  @ApiProperty({ enum: ['RUNNING', 'DONE', 'FAILED'] }) status!: string;
  @ApiProperty() created!: number;
  @ApiProperty() skipped!: number;
  @ApiProperty({ type: [RunErrorDto] }) errors!: RunErrorDto[];
}

export class StatementLineDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: OWNER_STATEMENT_LINE_TYPES }) lineType!: string;
  @ApiProperty() label!: string;
  @ApiProperty(POSITIVE_AMOUNT) amount!: number;
  @ApiProperty() isDebit!: boolean;
  @ApiProperty() position!: number;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) propertyId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) unitId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) leaseId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) tenantId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) invoiceId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) paymentId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) expenseId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) commissionId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date' }) periodStart!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date' }) periodEnd!: string | null;
}

class LandlordRefDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() displayName!: string;
}

class PropertyRefDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
}

export class StatementSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() statementNumber!: string;
  @ApiProperty({ enum: STATEMENT_STATUSES }) status!: string;
  @ApiProperty({ type: LandlordRefDto }) landlord!: LandlordRefDto;
  @ApiProperty({ nullable: true, type: PropertyRefDto }) property!: PropertyRefDto | null;
  @ApiProperty({ format: 'date' }) periodStart!: string;
  @ApiProperty({ format: 'date' }) periodEnd!: string;
  @ApiProperty(POSITIVE_AMOUNT) rentCollectedAmount!: number;
  @ApiProperty(POSITIVE_AMOUNT) commissionAmount!: number;
  @ApiProperty(POSITIVE_AMOUNT) expensesAmount!: number;
  @ApiProperty(AMOUNT) carryForwardAmount!: number;
  @ApiProperty(AMOUNT) netPayableAmount!: number;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) issuedAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) sentAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) settledAt!: string | null;
}

export class StatementPageDto {
  @ApiProperty({ type: [StatementSummaryDto] }) items!: StatementSummaryDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}

class PayoutRefDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() status!: string;
  @ApiProperty() method!: string;
  @ApiProperty(POSITIVE_AMOUNT) amount!: number;
  @ApiProperty(POSITIVE_AMOUNT) netAmount!: number;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) paidAt!: string | null;
}

export class StatementDetailDto extends StatementSummaryDto {
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) mandateId!: string | null;
  @ApiProperty(POSITIVE_AMOUNT) chargesCollectedAmount!: number;
  @ApiProperty(POSITIVE_AMOUNT) commissionVatAmount!: number;
  @ApiProperty(POSITIVE_AMOUNT) depositsHeldAmount!: number;
  @ApiProperty({ nullable: true, type: Number }) occupancyRateBps!: number | null;
  @ApiProperty({ nullable: true, type: Number }) collectionRateBps!: number | null;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) documentId!: string | null;
  @ApiProperty({ type: [StatementLineDto] }) lines!: StatementLineDto[];
  @ApiProperty({ nullable: true, type: PayoutRefDto }) payout!: PayoutRefDto | null;
}

export class PdfDownloadDto {
  @ApiProperty() downloadUrl!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
}
