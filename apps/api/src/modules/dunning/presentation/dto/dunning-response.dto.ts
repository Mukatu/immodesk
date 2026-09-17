import { ApiProperty } from '@nestjs/swagger';
import { PageInfoDto } from '../../../parties/presentation/dto/landlords.dto';
import { DUNNING_STEP_STATUSES } from '../../domain/dunning-types';

const AMOUNT = { type: 'integer', format: 'int64', example: 50_000 } as const;

export class DunningRunInvoiceRefDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ nullable: true, type: String }) invoiceNumber!: string | null;
}

export class DunningRunTenantRefDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() displayName!: string;
}

export class DunningRunDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) ruleId!: string;
  @ApiProperty() ruleName!: string;
  @ApiProperty() stepOrder!: number;
  @ApiProperty({ enum: DUNNING_STEP_STATUSES }) status!: string;
  @ApiProperty({ format: 'date' }) runDate!: string;
  @ApiProperty({ format: 'date-time' }) scheduledAt!: string;
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) executedAt!: string | null;
  @ApiProperty() daysOverdue!: number;
  @ApiProperty(AMOUNT) balanceAmount!: number;
  @ApiProperty() channel!: string;
  @ApiProperty({ type: DunningRunInvoiceRefDto, nullable: true })
  invoice!: DunningRunInvoiceRefDto | null;
  @ApiProperty({ type: DunningRunTenantRefDto }) tenant!: DunningRunTenantRefDto;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) notificationId!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) messageLogId!: string | null;
  @ApiProperty({ nullable: true, type: String }) messageStatus!: string | null;
  @ApiProperty() guarantorNotified!: boolean;
  @ApiProperty() penaltyApplied!: boolean;
  @ApiProperty(AMOUNT) penaltyAmount!: number;
  @ApiProperty({ nullable: true, type: String }) skipReason!: string | null;
  @ApiProperty({ nullable: true, type: String }) errorMessage!: string | null;
}

export class DunningRunPageDto {
  @ApiProperty({ type: [DunningRunDto] }) items!: DunningRunDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}

export class DunningTriggerAcceptedDto {
  @ApiProperty() scanned!: number;
  @ApiProperty() created!: number;
  @ApiProperty() skipped!: number;
  @ApiProperty() failed!: number;
  @ApiProperty() dryRun!: boolean;
}
