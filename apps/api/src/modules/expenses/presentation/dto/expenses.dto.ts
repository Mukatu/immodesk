import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PageInfoDto } from '../../../parties/presentation/dto/landlords.dto';
import { EXPENSE_BEARERS, EXPENSE_CATEGORIES, EXPENSE_STATUSES } from '../../domain/expense-rules';

const AMOUNT = { type: 'integer', format: 'int64', minimum: 0, example: 45_000 } as const;
const BPS = { type: 'integer', minimum: 0, maximum: 10_000 } as const;

export class ExpenseInputDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() propertyId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() unitId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() leaseId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() landlordId?: string;

  @ApiProperty({ enum: EXPENSE_CATEGORIES }) @IsIn(EXPENSE_CATEGORIES) category!: string;
  @ApiProperty({ example: 'Réparation fuite salle de bain' })
  @IsString()
  @MaxLength(200)
  label!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;

  @ApiPropertyOptional({ example: 'Plomberie Malonga' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplierName?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32) supplierPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) supplierNiu?: string;

  @ApiProperty(AMOUNT) @Type(() => Number) @IsInt() @Min(0) amount!: number;
  @ApiPropertyOptional(BPS)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  vatRateBps?: number;

  @ApiProperty({ format: 'date' }) @IsISO8601({ strict: false }) expenseDate!: string;

  @ApiPropertyOptional({ enum: EXPENSE_BEARERS, default: 'LANDLORD' })
  @IsOptional()
  @IsIn(EXPENSE_BEARERS)
  borneBy?: string;

  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() isRebillable?: boolean;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isDeductibleFromRent?: boolean;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() invoiceDocumentId?: string;

  @ApiPropertyOptional({ description: 'ULID généré par l’appareil : clé d’idempotence.' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  clientRef?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

/** `PATCH /{id}` : tous les champs sauf `clientRef` (contrat, règle 5). */
export class ExpenseUpdateDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() propertyId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() unitId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() leaseId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() landlordId?: string;
  @ApiPropertyOptional({ enum: EXPENSE_CATEGORIES })
  @IsOptional()
  @IsIn(EXPENSE_CATEGORIES)
  category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) label?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) supplierName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32) supplierPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) supplierNiu?: string;

  @ApiPropertyOptional(AMOUNT) @IsOptional() @Type(() => Number) @IsInt() @Min(0) amount?: number;
  @ApiPropertyOptional(BPS)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  vatRateBps?: number;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  expenseDate?: string;
  @ApiPropertyOptional({ enum: EXPENSE_BEARERS })
  @IsOptional()
  @IsIn(EXPENSE_BEARERS)
  borneBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRebillable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDeductibleFromRent?: boolean;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() invoiceDocumentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class RejectExpenseDto {
  @ApiProperty({ example: 'Facture non justifiée.' }) @IsString() @MaxLength(1000) reason!: string;
}

export class ListExpensesQueryDto {
  @ApiPropertyOptional({ enum: EXPENSE_STATUSES })
  @IsOptional()
  @IsIn(EXPENSE_STATUSES)
  status?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() propertyId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() landlordId?: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  from?: string;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601({ strict: false }) to?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(512) cursor?: string;
}

export class ExpenseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) propertyId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) unitId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) leaseId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) landlordId!: string | null;
  @ApiProperty({ enum: EXPENSE_CATEGORIES }) category!: string;
  @ApiProperty() label!: string;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty({ nullable: true, type: String }) supplierName!: string | null;
  @ApiProperty({ nullable: true, type: String }) supplierPhone!: string | null;
  @ApiProperty({ nullable: true, type: String }) supplierNiu!: string | null;
  @ApiProperty(AMOUNT) amount!: number;
  @ApiProperty(BPS) vatRateBps!: number;
  @ApiProperty({ format: 'date' }) expenseDate!: string;
  @ApiProperty({ enum: EXPENSE_BEARERS }) borneBy!: string;
  @ApiProperty() isRebillable!: boolean;
  @ApiProperty() isDeductibleFromRent!: boolean;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) invoiceDocumentId!: string | null;
  @ApiProperty({ nullable: true, type: String }) clientRef!: string | null;
  @ApiProperty({ nullable: true, type: String }) notes!: string | null;
  @ApiProperty() reference!: string;
  @ApiProperty({ enum: EXPENSE_STATUSES }) status!: string;
  @ApiProperty(AMOUNT) vatAmount!: number;
  @ApiProperty(AMOUNT) totalAmount!: number;
  @ApiProperty({ example: 'XAF' }) currency!: 'XAF';
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) ownerStatementId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) approvedByUserId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) approvedAt!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class ExpensePageDto {
  @ApiProperty({ type: [ExpenseDto] }) items!: ExpenseDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}
