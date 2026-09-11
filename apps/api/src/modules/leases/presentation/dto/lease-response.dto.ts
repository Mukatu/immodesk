import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DEPOSIT_MOVEMENT_TYPES, DEPOSIT_STATUSES } from '../../../deposits/domain/deposit-rules';
import { PageInfoDto } from '../../../parties/presentation/dto/landlords.dto';
import {
  LEASE_DOCUMENT_KINDS,
  LEASE_PARTY_ROLES,
  LEASE_STATUSES,
  PAYMENT_METHODS,
  RENT_PERIODS,
} from '../../domain/lease-status';

const AMOUNT = { type: 'integer', format: 'int64', example: 150_000 } as const;
const NULLABLE_STRING = { nullable: true, type: String } as const;

export class LeaseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) unitId!: string;
  @ApiProperty({ format: 'uuid' }) propertyId!: string;
  @ApiProperty({ format: 'uuid' }) landlordId!: string;
  @ApiProperty({ format: 'uuid' }) primaryTenantId!: string;
  @ApiProperty({ ...NULLABLE_STRING, example: 'BAIL-2026-00042' }) reference!: string | null;
  @ApiProperty({ enum: [...LEASE_STATUSES] }) status!: string;
  @ApiProperty({ format: 'date' }) startDate!: string;
  @ApiProperty(NULLABLE_STRING) endDate!: string | null;
  @ApiProperty(NULLABLE_STRING) moveInDate!: string | null;
  @ApiProperty(NULLABLE_STRING) moveOutDate!: string | null;
  @ApiProperty({ enum: [...RENT_PERIODS] }) rentPeriod!: string;
  @ApiProperty(AMOUNT) rentAmount!: number;
  @ApiProperty({ ...AMOUNT, example: 10_000 }) chargesAmount!: number;
  @ApiProperty() chargesAreProvisional!: boolean;
  @ApiProperty({ ...AMOUNT, example: 300_000 }) depositAmount!: number;
  @ApiProperty({ ...AMOUNT, example: 0 }) agencyFeeAmount!: number;
  @ApiProperty({ example: 0 }) advanceMonths!: number;
  @ApiProperty({ enum: ['XAF'] }) currency!: string;
  @ApiProperty({ example: 5 }) paymentDueDay!: number;
  @ApiProperty({ example: 5 }) graceDays!: number;
  @ApiProperty({ enum: [...PAYMENT_METHODS] }) preferredPaymentMethod!: string;
  @ApiProperty(NULLABLE_STRING) collectorUserId!: string | null;
  @ApiProperty({ nullable: true, type: Number }) indexationRateBps!: number | null;
  @ApiProperty(NULLABLE_STRING) nextIndexationDate!: string | null;
  @ApiProperty({ example: 30 }) noticeDays!: number;
  @ApiProperty() autoRenew!: boolean;
  @ApiProperty(NULLABLE_STRING) signedAt!: string | null;
  @ApiProperty(NULLABLE_STRING) contractDocumentId!: string | null;
  @ApiProperty(NULLABLE_STRING) terminatedAt!: string | null;
  @ApiProperty(NULLABLE_STRING) terminationReason!: string | null;
  @ApiProperty({ type: 'integer', format: 'int64', example: 0 }) balanceAmount!: number;
  @ApiProperty(NULLABLE_STRING) clientRef!: string | null;
  @ApiProperty(NULLABLE_STRING) notes!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
  @ApiProperty(NULLABLE_STRING) deletedAt!: string | null;
}

export class LeaseUnitRefDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'A1' }) code!: string;
  @ApiProperty(NULLABLE_STRING) label!: string | null;
}

export class LeasePropertyRefDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'Résidence Mpila' }) name!: string;
}

export class LeaseTenantRefDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'Bernadette Loemba' }) displayName!: string;
  @ApiProperty({ example: '+242066200001' }) primaryPhone!: string;
}

export class LeaseSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty(NULLABLE_STRING) reference!: string | null;
  @ApiProperty({ enum: [...LEASE_STATUSES] }) status!: string;
  @ApiProperty({ type: LeaseUnitRefDto }) unit!: LeaseUnitRefDto;
  @ApiProperty({ type: LeasePropertyRefDto }) property!: LeasePropertyRefDto;
  @ApiProperty({ type: LeaseTenantRefDto }) tenant!: LeaseTenantRefDto;
  @ApiProperty({ format: 'date' }) startDate!: string;
  @ApiProperty(NULLABLE_STRING) endDate!: string | null;
  @ApiProperty(AMOUNT) rentAmount!: number;
  @ApiProperty({ ...AMOUNT, example: 10_000 }) chargesAmount!: number;
  @ApiProperty({ example: 5 }) paymentDueDay!: number;
}

export class LeasePageDto {
  @ApiProperty({ type: [LeaseSummaryDto] }) items!: LeaseSummaryDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}

export class RentRevisionDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) leaseId!: string;
  @ApiProperty({ format: 'date' }) effectiveDate!: string;
  @ApiProperty(AMOUNT) previousRentAmount!: number;
  @ApiProperty({ ...AMOUNT, example: 165_000 }) newRentAmount!: number;
  @ApiProperty({ ...AMOUNT, example: 10_000 }) previousChargesAmount!: number;
  @ApiProperty({ ...AMOUNT, example: 12_000 }) newChargesAmount!: number;
  @ApiProperty(NULLABLE_STRING) reason!: string | null;
  @ApiProperty(NULLABLE_STRING) documentId!: string | null;
  @ApiProperty(NULLABLE_STRING) createdByUserId!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class RentRevisionListDto {
  @ApiProperty({ type: [RentRevisionDto] }) items!: RentRevisionDto[];
}

export class RentAtDto {
  @ApiProperty({ format: 'date' }) date!: string;
  @ApiProperty(AMOUNT) rentAmount!: number;
  @ApiProperty({ ...AMOUNT, example: 10_000 }) chargesAmount!: number;
  @ApiProperty({ enum: ['INITIAL', 'REVISION'] }) source!: string;
  @ApiProperty(NULLABLE_STRING) revisionId!: string | null;
}

export class LeasePartyDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) leaseId!: string;
  @ApiProperty({ enum: [...LEASE_PARTY_ROLES] }) role!: string;
  @ApiProperty(NULLABLE_STRING) tenantId!: string | null;
  @ApiProperty(NULLABLE_STRING) guarantorId!: string | null;
  @ApiProperty({ example: 'Serge Makaya' }) displayName!: string;
  @ApiProperty({ example: 10_000 }) shareBps!: number;
  @ApiProperty() isSolidary!: boolean;
  @ApiProperty(NULLABLE_STRING) signedAt!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class LeaseDocumentDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) leaseId!: string;
  @ApiProperty({ enum: [...LEASE_DOCUMENT_KINDS] }) kind!: string;
  @ApiProperty({ format: 'uuid' }) documentId!: string;
  @ApiProperty({ example: 1 }) version!: number;
  @ApiProperty({ example: 'Contrat de bail BAIL-2026-00042 v1' }) title!: string;
  @ApiProperty(NULLABLE_STRING) effectiveDate!: string | null;
  @ApiProperty() isSigned!: boolean;
  @ApiProperty(NULLABLE_STRING) signedAt!: string | null;
  @ApiProperty({ ...NULLABLE_STRING, description: 'SHA-256 du HTML source du contrat.' })
  signatureHash!: string | null;
  @ApiProperty(NULLABLE_STRING) generatedByJob!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class LeaseDocumentListDto {
  @ApiProperty({ type: [LeaseDocumentDto] }) items!: LeaseDocumentDto[];
}

export class ContractJobDto {
  @ApiProperty({ example: 'contract-…' }) jobId!: string;
  @ApiProperty({ enum: ['QUEUED', 'RUNNING', 'DONE', 'FAILED'] }) status!: string;
  @ApiPropertyOptional({ format: 'uuid' }) leaseDocumentId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) documentId?: string;
  @ApiPropertyOptional({ example: 2 }) version?: number;
  @ApiPropertyOptional() error?: string;
}

export class DepositMovementDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) depositId!: string;
  @ApiProperty({ format: 'uuid' }) leaseId!: string;
  @ApiProperty({ enum: [...DEPOSIT_MOVEMENT_TYPES] }) movementType!: string;
  @ApiProperty({ ...AMOUNT, example: 150_000 }) amount!: number;
  @ApiProperty({ enum: ['XAF'] }) currency!: string;
  @ApiProperty({ format: 'date' }) movementDate!: string;
  @ApiProperty(NULLABLE_STRING) paymentId!: string | null;
  @ApiProperty(NULLABLE_STRING) inspectionId!: string | null;
  @ApiProperty(NULLABLE_STRING) reason!: string | null;
  @ApiProperty(NULLABLE_STRING) reversalOfId!: string | null;
  @ApiProperty(NULLABLE_STRING) createdByUserId!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class DepositDetailDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) leaseId!: string;
  @ApiProperty({ format: 'uuid' }) tenantId!: string;
  @ApiProperty({ enum: [...DEPOSIT_STATUSES] }) status!: string;
  @ApiProperty({ ...AMOUNT, example: 300_000 }) requiredAmount!: number;
  @ApiProperty({ ...AMOUNT, example: 300_000 }) collectedAmount!: number;
  @ApiProperty({ ...AMOUNT, example: 45_000 }) deductedAmount!: number;
  @ApiProperty({ ...AMOUNT, example: 255_000 }) refundedAmount!: number;
  @ApiProperty({ ...AMOUNT, example: 0 }) heldAmount!: number;
  @ApiProperty({ enum: ['XAF'] }) currency!: string;
  @ApiProperty({ example: 'ORGANIZATION' }) heldBy!: string;
  @ApiProperty({ nullable: true, type: Number }) monthsEquivalent!: number | null;
  @ApiProperty(NULLABLE_STRING) dueDate!: string | null;
  @ApiProperty(NULLABLE_STRING) fullyCollectedAt!: string | null;
  @ApiProperty(NULLABLE_STRING) refundDueDate!: string | null;
  @ApiProperty(NULLABLE_STRING) refundedAt!: string | null;
  @ApiProperty(NULLABLE_STRING) refundBankAccountId!: string | null;
  @ApiProperty({ type: [DepositMovementDto] }) movements!: DepositMovementDto[];
}

export class LeaseDetailDto extends LeaseDto {
  @ApiProperty({ type: Object }) unit!: Record<string, unknown>;
  @ApiProperty({ type: Object }) property!: Record<string, unknown>;
  @ApiProperty({ type: Object }) landlord!: Record<string, unknown>;
  @ApiProperty({ type: Object }) primaryTenant!: Record<string, unknown>;
  @ApiProperty({ type: [LeasePartyDto] }) parties!: LeasePartyDto[];
  @ApiProperty({ type: [RentRevisionDto] }) rentRevisions!: RentRevisionDto[];
  @ApiProperty({ type: DepositDetailDto, nullable: true }) deposit!: DepositDetailDto | null;
  @ApiProperty({ type: [LeaseDocumentDto] }) documents!: LeaseDocumentDto[];
}
