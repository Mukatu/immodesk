import { ApiProperty } from '@nestjs/swagger';
import {
  InvoiceDetailDto,
  InvoiceLeaseRefDto,
} from '../../../billing/presentation/dto/billing-response.dto';
import { CashReceiptSummaryDto } from '../../../cash/presentation/dto/cash-receipt-summary.dto';
import { PageInfoDto } from '../../../parties/presentation/dto/landlords.dto';
import {
  NamedTenantRefDto,
  ReceiptSummaryDto,
} from '../../../receipts/presentation/dto/receipt-summary.dto';
import { CREDIT_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from '../../domain/payment-rules';

const AMOUNT = { type: 'integer', format: 'int64', example: 100_000 } as const;
const NULLABLE_DATE_TIME = { format: 'date-time', nullable: true, type: String } as const;

export class PaymentSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'PAY-202609-00001' }) reference!: string;
  @ApiProperty({ enum: PAYMENT_METHODS }) method!: string;
  @ApiProperty({ enum: PAYMENT_STATUSES }) status!: string;
  @ApiProperty({ enum: ['INBOUND', 'OUTBOUND'] }) direction!: string;
  @ApiProperty(AMOUNT) amount!: number;
  @ApiProperty(AMOUNT) allocatedAmount!: number;
  @ApiProperty(AMOUNT) unallocatedAmount!: number;
  @ApiProperty({ format: 'date' }) paymentDate!: string;
  @ApiProperty({ type: NamedTenantRefDto, nullable: true }) tenant!: NamedTenantRefDto | null;
  @ApiProperty({ type: InvoiceLeaseRefDto, nullable: true }) lease!: InvoiceLeaseRefDto | null;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) receivedByUserId!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) reversalOfId!: string | null;
}

export class PaymentAllocationDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) invoiceId!: string | null;
  @ApiProperty({ nullable: true, type: String }) invoiceNumber!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) tenantCreditId!: string | null;
  @ApiProperty(AMOUNT) amount!: number;
  @ApiProperty() isReversal!: boolean;
}

export class PaymentDetailDto extends PaymentSummaryDto {
  @ApiProperty({ nullable: true, type: String }) externalReference!: string | null;
  @ApiProperty(AMOUNT) feeAmount!: number;
  @ApiProperty(AMOUNT) netAmount!: number;
  @ApiProperty(NULLABLE_DATE_TIME) confirmedAt!: string | null;
  @ApiProperty(NULLABLE_DATE_TIME) rejectedAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) rejectionReason!: string | null;
  @ApiProperty(NULLABLE_DATE_TIME) reversedAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) reversalReason!: string | null;
  @ApiProperty({ type: [PaymentAllocationDto] }) allocations!: PaymentAllocationDto[];
  @ApiProperty({ type: CashReceiptSummaryDto, nullable: true })
  cashReceipt!: CashReceiptSummaryDto | null;
  @ApiProperty({ type: [ReceiptSummaryDto] }) receipts!: ReceiptSummaryDto[];
  @ApiProperty({ nullable: true, type: String }) clientRef!: string | null;
  @ApiProperty({ nullable: true, type: String }) notes!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class PaymentPageDto {
  @ApiProperty({ type: [PaymentSummaryDto] }) items!: PaymentSummaryDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}

export class ReversalResultDto {
  @ApiProperty({ type: PaymentDetailDto }) original!: PaymentDetailDto;
  @ApiProperty({ type: PaymentDetailDto }) reversal!: PaymentDetailDto;
}

export class TenantCreditDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) tenantId!: string;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) leaseId!: string | null;
  @ApiProperty({ enum: CREDIT_STATUSES }) status!: string;
  @ApiProperty({ example: 'OVERPAYMENT' }) origin!: string;
  @ApiProperty(AMOUNT) amount!: number;
  @ApiProperty(AMOUNT) usedAmount!: number;
  @ApiProperty(AMOUNT) remainingAmount!: number;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) sourcePaymentId!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) sourceInvoiceId!: string | null;
  @ApiProperty({ format: 'date', nullable: true, type: String }) expiresAt!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class TenantCreditListDto {
  @ApiProperty(AMOUNT) remainingAmount!: number;
  @ApiProperty({ type: [TenantCreditDto] }) items!: TenantCreditDto[];
}

export class ApplyCreditResultDto {
  @ApiProperty({ type: TenantCreditDto }) credit!: TenantCreditDto;
  @ApiProperty({ type: InvoiceDetailDto }) invoice!: InvoiceDetailDto;
}

export class StatementLineDto {
  @ApiProperty({ format: 'date' }) date!: string;
  @ApiProperty({ enum: ['INVOICE', 'PAYMENT', 'REVERSAL', 'CREDIT'] }) type!: string;
  @ApiProperty() reference!: string;
  @ApiProperty(AMOUNT) debit!: number;
  @ApiProperty(AMOUNT) credit!: number;
  @ApiProperty(AMOUNT) balance!: number;
}

export class TenantStatementDto {
  @ApiProperty(AMOUNT) openingBalance!: number;
  @ApiProperty({ type: [StatementLineDto] }) lines!: StatementLineDto[];
  @ApiProperty(AMOUNT) closingBalance!: number;
}
