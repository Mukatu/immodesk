import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { MEMBER_ROLES } from '../../../../shared/tenant/roles';
import {
  BillingSettingsDto,
  CashSettingsDto,
  MessagingSettingsDto,
  Type,
  UpdateBillingSettingsDto,
  UpdateCashSettingsDto,
  UpdateMessagingSettingsDto,
} from './operational-settings.dto';
import { OrganizationDto } from '../../../identity/presentation/dto/auth.dto';

const ROLE_VALUES = [...MEMBER_ROLES];

export class CreateOrganizationDto {
  @ApiProperty({ enum: ['AGENCY', 'INDEPENDENT_LANDLORD', 'INDEPENDENT_MANAGER'] })
  @IsIn(['AGENCY', 'INDEPENDENT_LANDLORD', 'INDEPENDENT_MANAGER'])
  type!: 'AGENCY' | 'INDEPENDENT_LANDLORD' | 'INDEPENDENT_MANAGER';

  @ApiProperty({ example: 'Agence Mpila Immo SARL' })
  @IsString()
  @Length(2, 200)
  legalName!: string;

  @ApiPropertyOptional({ example: 'Agence Mpila Immo' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string;

  @ApiProperty({ example: 'Brazzaville' })
  @IsString()
  @Length(2, 120)
  city!: string;

  @ApiPropertyOptional({ example: 'Mpila' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  district?: string;

  @ApiProperty({ example: '+242066000001' })
  @IsString()
  @MaxLength(24)
  contactPhone!: string;

  @ApiPropertyOptional({ example: 'contact@mpila-immo.cg' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 200) legalName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) tradeName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 120) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) district?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(24) contactPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() contactEmail?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() logoDocumentId?: string;
}

export class OrganizationSettingsDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 28 }) defaultPaymentDueDay!: number;
  @ApiProperty({ example: 'Africa/Brazzaville' }) timezone!: string;
  @ApiProperty({ enum: ['XAF'], example: 'XAF' }) currency!: 'XAF';
  @ApiProperty({ example: 5 }) defaultGraceDays!: number;
  @ApiProperty({ nullable: true, type: String }) receiptFooterText!: string | null;
  @ApiProperty() whatsappEnabled!: boolean;
  @ApiProperty() smsEnabled!: boolean;
  @ApiProperty({ type: BillingSettingsDto }) billing!: BillingSettingsDto;
  @ApiProperty({ type: CashSettingsDto }) cash!: CashSettingsDto;
  @ApiProperty({ type: MessagingSettingsDto }) messaging!: MessagingSettingsDto;
}

export class UpdateOrganizationSettingsDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 28 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  defaultPaymentDueDay?: number;

  @ApiPropertyOptional({ example: 'Africa/Brazzaville' })
  @IsOptional()
  @IsString()
  @Length(3, 64)
  timezone?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  defaultGraceDays?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  receiptFooterText?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() whatsappEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() smsEnabled?: boolean;

  @ApiPropertyOptional({ type: UpdateBillingSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateBillingSettingsDto)
  billing?: UpdateBillingSettingsDto;

  @ApiPropertyOptional({ type: UpdateCashSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCashSettingsDto)
  cash?: UpdateCashSettingsDto;

  @ApiPropertyOptional({ type: UpdateMessagingSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateMessagingSettingsDto)
  messaging?: UpdateMessagingSettingsDto;
}

export class MemberUserDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() phone!: string;
  @ApiProperty() fullName!: string;
}

export class MemberDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: MemberUserDto }) user!: MemberUserDto;
  @ApiProperty({ enum: ROLE_VALUES }) role!: string;
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED'] }) status!: string;
  @ApiProperty({ format: 'date-time' }) joinedAt!: string;
}

export class MemberListDto {
  @ApiProperty({ type: [MemberDto] }) items!: MemberDto[];
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ROLE_VALUES })
  @IsIn(ROLE_VALUES)
  role!: 'OWNER' | 'MANAGER' | 'COLLECTOR' | 'ACCOUNTANT' | 'VIEWER';
}

export class CreateInvitationDto {
  @ApiProperty({ example: '+242066000002' })
  @IsString()
  @MaxLength(24)
  phone!: string;

  @ApiProperty({ enum: ROLE_VALUES })
  @IsIn(ROLE_VALUES)
  role!: 'OWNER' | 'MANAGER' | 'COLLECTOR' | 'ACCOUNTANT' | 'VIEWER';

  @ApiPropertyOptional({ example: 'Alphonse Ngoma' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  fullName?: string;
}

export class InvitationDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() phone!: string;
  @ApiProperty({ enum: ROLE_VALUES }) role!: string;
  @ApiProperty({ enum: ['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'] }) status!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class InvitationListDto {
  @ApiProperty({ type: [InvitationDto] }) items!: InvitationDto[];
}

export class PublicInvitationDto {
  @ApiProperty({ example: 'Agence Mpila Immo' }) organizationName!: string;
  @ApiProperty({ enum: ROLE_VALUES }) role!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
}

export class AcceptedMembershipDto {
  @ApiProperty({ type: OrganizationDto }) organization!: OrganizationDto;
  @ApiProperty({ enum: ROLE_VALUES }) role!: string;
  @ApiProperty({ format: 'date-time' }) joinedAt!: string;
}

export class FeatureFlagsDto {
  @ApiProperty({
    type: Object,
    additionalProperties: { type: 'boolean' },
    example: { 'demo.banner': true },
  })
  flags!: Record<string, boolean>;
}
