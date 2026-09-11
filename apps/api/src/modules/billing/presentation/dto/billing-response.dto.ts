import { ApiProperty } from '@nestjs/swagger';
import { PageInfoDto } from '../../../parties/presentation/dto/landlords.dto';
import { ReceiptSummaryDto } from '../../../receipts/presentation/dto/receipt-summary.dto';
import { INVOICE_LINE_TYPES } from '../../domain/invoice-lines';
import { INVOICE_STATUSES } from '../../domain/invoice-status';
import { PENALTY_BASES } from '../../domain/penalties';

const AMOUNT = { type: 'integer', format: 'int64', example: 85_000 } as const;
const PAYMENT_METHODS = ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'BANK_CHECK'] as const;

export class InvoiceLeaseRefDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ nullable: true, type: String, example: 'BAIL-2026-00001' }) reference!:
    string | null;
}

export class InvoiceTenantRefDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'Bernadette Loemba' }) displayName!: string;
  @ApiProperty({ example: '+242066200001' }) primaryPhone!: string;
}

export class InvoiceUnitRefDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'A1' }) code!: string;
}

export class InvoicePropertyRefDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'Résidence Mpila' }) name!: string;
}

export class InvoiceSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ nullable: true, type: String, example: 'LOY-202609-00001' }) invoiceNumber!:
    string | null;
  @ApiProperty({ enum: INVOICE_STATUSES }) status!: string;
  @ApiProperty({ type: InvoiceLeaseRefDto }) lease!: InvoiceLeaseRefDto;
  @ApiProperty({ type: InvoiceTenantRefDto }) tenant!: InvoiceTenantRefDto;
  @ApiProperty({ type: InvoiceUnitRefDto }) unit!: InvoiceUnitRefDto;
  @ApiProperty({ type: InvoicePropertyRefDto }) property!: InvoicePropertyRefDto;
  @ApiProperty({ format: 'date' }) periodStart!: string;
  @ApiProperty({ format: 'date' }) periodEnd!: string;
  @ApiProperty({ format: 'date' }) dueDate!: string;
  @ApiProperty({ format: 'date', nullable: true, type: String }) graceUntilDate!: string | null;
  @ApiProperty(AMOUNT) totalAmount!: number;
  @ApiProperty(AMOUNT) paidAmount!: number;
  @ApiProperty(AMOUNT) balanceAmount!: number;
}

export class InvoiceLineDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) invoiceId!: string;
  @ApiProperty({ enum: INVOICE_LINE_TYPES }) lineType!: string;
  @ApiProperty() label!: string;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty({ example: 1 }) quantity!: number;
  @ApiProperty(AMOUNT) unitPriceAmount!: number;
  @ApiProperty(AMOUNT) amount!: number;
  @ApiProperty() vatRateBps!: number;
  @ApiProperty(AMOUNT) vatAmount!: number;
  @ApiProperty() isCredit!: boolean;
  @ApiProperty({ format: 'date', nullable: true, type: String }) periodStart!: string | null;
  @ApiProperty({ format: 'date', nullable: true, type: String }) periodEnd!: string | null;
  @ApiProperty() position!: number;
}

export class AllocationViewDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) paymentId!: string;
  @ApiProperty({ example: 'PAY-202609-00001' }) paymentReference!: string;
  @ApiProperty({ enum: PAYMENT_METHODS }) method!: string;
  @ApiProperty(AMOUNT) amount!: number;
  @ApiProperty({ format: 'date' }) allocationDate!: string;
  @ApiProperty() isReversal!: boolean;
}

export class InvoiceDetailDto extends InvoiceSummaryDto {
  @ApiProperty(AMOUNT) rentAmount!: number;
  @ApiProperty(AMOUNT) chargesAmount!: number;
  @ApiProperty(AMOUNT) penaltyAmount!: number;
  @ApiProperty(AMOUNT) otherAmount!: number;
  @ApiProperty(AMOUNT) discountAmount!: number;
  @ApiProperty({ format: 'date' }) issueDate!: string;
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) issuedAt!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) paidAt!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) cancelledAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) cancellationReason!: string | null;
  @ApiProperty({ type: [InvoiceLineDto] }) lines!: InvoiceLineDto[];
  @ApiProperty({ type: [AllocationViewDto] }) allocations!: AllocationViewDto[];
  @ApiProperty({ type: ReceiptSummaryDto, nullable: true }) receipt!: ReceiptSummaryDto | null;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) documentId!: string | null;
  @ApiProperty({ nullable: true, type: String }) notes!: string | null;
}

export class InvoicePageDto {
  @ApiProperty({ type: [InvoiceSummaryDto] }) items!: InvoiceSummaryDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}

export class BillingRunAcceptedDto {
  @ApiProperty({ format: 'uuid' }) runId!: string;
}

export class BillingRunErrorDto {
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) leaseId!: string | null;
  @ApiProperty() reason!: string;
}

export class BillingRunDto {
  @ApiProperty({ format: 'uuid' }) runId!: string;
  @ApiProperty({ enum: ['RUNNING', 'DONE', 'FAILED'] }) status!: string;
  @ApiProperty({ format: 'date-time' }) startedAt!: string;
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) finishedAt!: string | null;
  @ApiProperty() created!: number;
  @ApiProperty() skipped!: number;
  @ApiProperty({ type: [BillingRunErrorDto] }) errors!: BillingRunErrorDto[];
  @ApiProperty() dryRun!: boolean;
  @ApiProperty({ format: 'date', nullable: true, type: String }) periodStart!: string | null;
}

export class DashboardPropertyDto {
  @ApiProperty({ format: 'uuid' }) propertyId!: string;
  @ApiProperty() name!: string;
  @ApiProperty(AMOUNT) expected!: number;
  @ApiProperty(AMOUNT) collected!: number;
  @ApiProperty(AMOUNT) outstanding!: number;
}

export class BillingDashboardDto {
  @ApiProperty({ example: '2026-09' }) period!: string;
  @ApiProperty(AMOUNT) expectedAmount!: number;
  @ApiProperty(AMOUNT) collectedAmount!: number;
  @ApiProperty(AMOUNT) outstandingAmount!: number;
  @ApiProperty(AMOUNT) overdueAmount!: number;
  @ApiProperty() invoicesCount!: number;
  @ApiProperty() paidCount!: number;
  @ApiProperty({ type: [DashboardPropertyDto] }) byProperty!: DashboardPropertyDto[];
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'integer', format: 'int64' },
    example: { CASH: 160_000, MOBILE_MONEY: 0, BANK_TRANSFER: 0, BANK_CHECK: 0 },
  })
  byMethod!: Record<string, number>;
}

export class PenaltyRuleDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: PENALTY_BASES }) basis!: string;
  @ApiProperty({ nullable: true, type: Number }) rateBps!: number | null;
  @ApiProperty({ ...AMOUNT, nullable: true }) flatAmount!: number | null;
  @ApiProperty() graceDays!: number;
  @ApiProperty({ ...AMOUNT, nullable: true }) capAmount!: number | null;
  @ApiProperty({ nullable: true, type: Number }) capRateBps!: number | null;
  @ApiProperty({ nullable: true, type: Number }) maxPeriods!: number | null;
  @ApiProperty() appliesToCharges!: boolean;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() isDefault!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class PenaltyRuleListDto {
  @ApiProperty({ type: [PenaltyRuleDto] }) items!: PenaltyRuleDto[];
}
