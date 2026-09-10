import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
import { BANK_ACCOUNT_HOLDER_TYPES, MOMO_PROVIDERS } from '../../application/bank-accounts.service';

const HOLDER_VALUES = [...BANK_ACCOUNT_HOLDER_TYPES];
const MOMO_VALUES = [...MOMO_PROVIDERS];

/**
 * Banques de référence du contrat de phase 1. La liste alimente les
 * sélecteurs ; `bankCode` reste un texte libre côté base, aucune liste n'étant
 * figée par le DDL.
 */
export const REFERENCE_BANKS = [
  { bankCode: 'BGFI', bankName: 'BGFIBank Congo' },
  { bankCode: 'LCB', bankName: 'LCB Bank' },
  { bankCode: 'ECOBANK', bankName: 'Ecobank Congo' },
  { bankCode: 'UBA', bankName: 'UBA Congo' },
  { bankCode: 'BSCA', bankName: 'BSCA Bank' },
  { bankCode: 'CDCO', bankName: 'Crédit du Congo' },
  { bankCode: 'SGC', bankName: 'Société Générale Congo' },
  { bankCode: 'BCI', bankName: 'Banque Commerciale Internationale' },
  { bankCode: 'MTN_MOMO', bankName: 'MTN Mobile Money' },
  { bankCode: 'AIRTEL_MONEY', bankName: 'Airtel Money' },
] as const;

export class BankAccountBodyDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Requis si `holderType` vaut LANDLORD.' })
  @IsOptional()
  @IsUUID()
  landlordId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Requis si `holderType` vaut TENANT.' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) branchName?: string;

  @ApiPropertyOptional({ example: '00012345678901' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  accountNumber?: string;

  @ApiPropertyOptional({ example: '76', description: 'Clé RIB à 2 chiffres (plan CEMAC).' })
  @IsOptional()
  @IsString()
  @MaxLength(4)
  ribKey?: string;

  @ApiPropertyOptional({ example: 'CG3930011000012345678901234' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  iban?: string;

  @ApiPropertyOptional({ example: 'BGFICGCGXXX' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  swiftBic?: string;

  @ApiPropertyOptional({ enum: MOMO_VALUES })
  @IsOptional()
  @IsIn(MOMO_VALUES)
  momoProvider?: string;

  @ApiPropertyOptional({
    example: '066123456',
    description: 'Portefeuille Mobile Money, normalisé en E.164 `+242…`.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  momoMsisdn?: string;

  @ApiPropertyOptional({
    description: 'Compte par défaut du titulaire. Le précédent est démarqué.',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreateBankAccountDto extends BankAccountBodyDto {
  @ApiProperty({ enum: HOLDER_VALUES, default: 'ORGANIZATION' })
  @IsIn(HOLDER_VALUES)
  holderType!: 'ORGANIZATION' | 'LANDLORD' | 'TENANT';

  @ApiProperty({ example: 'Compte courant BGFI' })
  @IsString()
  @Length(2, 120)
  label!: string;

  @ApiProperty({ example: 'BGFI', description: 'Voir les banques de référence du contrat.' })
  @IsString()
  @MaxLength(40)
  bankCode!: string;

  @ApiProperty({ example: 'BGFIBank Congo' })
  @IsString()
  @MaxLength(160)
  bankName!: string;

  @ApiProperty({ example: 'SCI Les Manguiers' })
  @IsString()
  @MaxLength(200)
  accountHolderName!: string;
}

export class UpdateBankAccountDto extends BankAccountBodyDto {
  @ApiPropertyOptional({ enum: HOLDER_VALUES })
  @IsOptional()
  @IsIn(HOLDER_VALUES)
  holderType?: 'ORGANIZATION' | 'LANDLORD' | 'TENANT';

  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 120) label?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) bankCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) accountHolderName?: string;
}

export class ListBankAccountsQueryDto {
  @ApiPropertyOptional({ enum: HOLDER_VALUES })
  @IsOptional()
  @IsIn(HOLDER_VALUES)
  holderType?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  landlordId?: string;
}

export class BankAccountDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: HOLDER_VALUES }) holderType!: string;
  @ApiProperty({ nullable: true, type: String }) landlordId!: string | null;
  @ApiProperty({ nullable: true, type: String }) tenantId!: string | null;
  @ApiProperty() label!: string;
  @ApiProperty() bankCode!: string;
  @ApiProperty() bankName!: string;
  @ApiProperty({ nullable: true, type: String }) branchName!: string | null;
  @ApiProperty() accountHolderName!: string;
  @ApiProperty({ nullable: true, type: String }) accountNumber!: string | null;
  @ApiProperty({ nullable: true, type: String }) ribKey!: string | null;
  @ApiProperty({ nullable: true, type: String }) iban!: string | null;
  @ApiProperty({ nullable: true, type: String }) swiftBic!: string | null;
  @ApiProperty({ nullable: true, type: String, enum: MOMO_VALUES }) momoProvider!: string | null;
  @ApiProperty({ nullable: true, type: String }) momoMsisdn!: string | null;
  @ApiProperty({ enum: ['XAF'] }) currency!: string;
  @ApiProperty() isDefault!: boolean;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class BankAccountListDto {
  @ApiProperty({ type: [BankAccountDto] }) items!: BankAccountDto[];
}
