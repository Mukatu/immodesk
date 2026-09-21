import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import { ReferralCommissionsQueryDto, ReferralsQueryDto } from './dto/referral-query.dto';
import {
  RegisterPropertyLeadDto,
  RegisterPropertyLeadResponseDto,
  RegisterReferralPartnerDto,
  ReferralPartnerDto,
} from './dto/referral-partners.dto';
import { ReferralCommissionListDto, ReferralListDto } from './dto/referral.dto';
import { ReferralPartnersService } from '../application/referral-partners.service';
import { ReferralPropertyLeadService } from '../application/referral-property-lead.service';
import { ReferralQueriesService } from '../application/referral-queries.service';
import { ReferralPartner } from './referral-partner.decorator';
import { ReferralPartnerGuard, type ReferralPartnerContext } from './referral-partner.guard';
import { requireUser } from './require-user';

@ApiTags('Apport d’affaires — partenaires')
@ApiBearerAuth()
@Controller('referral-partners')
@UseGuards(ReferralPartnerGuard)
export class ReferralPartnersController {
  constructor(
    private readonly partners: ReferralPartnersService,
    private readonly leads: ReferralPropertyLeadService,
    private readonly queries: ReferralQueriesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Devenir partenaire (statut PENDING_VERIFICATION)' })
  @ApiResponse({ status: 201, type: ReferralPartnerDto })
  @ApiResponse({ status: 409, description: 'REFERRALS.PARTNER_ALREADY_EXISTS' })
  async register(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: RegisterReferralPartnerDto,
  ): Promise<ReferralPartnerDto> {
    return this.partners.register(requireUser(user), dto.displayName);
  }

  @Get('me')
  @ReferralPartner()
  @ApiOperation({ summary: 'Mon compte partenaire' })
  @ApiResponse({ status: 200, type: ReferralPartnerDto })
  async getMe(@CurrentUser() user: AuthenticatedUser | undefined): Promise<ReferralPartnerDto> {
    return this.partners.getMe(requireUser(user));
  }

  @Post('me/properties')
  @ReferralPartner()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Enregistrer un immeuble (aucune ligne créée avant confirmation du bailleur)',
  })
  @ApiResponse({ status: 202, type: RegisterPropertyLeadResponseDto })
  async registerProperty(
    @Req() request: Request & { referralPartner?: ReferralPartnerContext },
    @Body() dto: RegisterPropertyLeadDto,
  ): Promise<RegisterPropertyLeadResponseDto> {
    const partner = request.referralPartner!;
    return this.leads.request(partner.userId, dto.landlordPhone, dto.channel ?? 'WHATSAPP');
  }

  @Get('me/referrals')
  @ReferralPartner()
  @ApiOperation({ summary: 'Mes parrainages' })
  @ApiResponse({ status: 200, type: ReferralListDto })
  async listReferrals(
    @Req() request: Request & { referralPartner?: ReferralPartnerContext },
    @Query() query: ReferralsQueryDto,
  ): Promise<ReferralListDto> {
    const partner = request.referralPartner!;
    return this.queries.listReferrals(partner.userId, partner.id, query);
  }

  @Get('me/commissions')
  @ReferralPartner()
  @ApiOperation({ summary: 'Mes commissions, avec totaux par statut' })
  @ApiResponse({ status: 200, type: ReferralCommissionListDto })
  async listCommissions(
    @Req() request: Request & { referralPartner?: ReferralPartnerContext },
    @Query() query: ReferralCommissionsQueryDto,
  ): Promise<ReferralCommissionListDto> {
    const partner = request.referralPartner!;
    return this.queries.listCommissions(partner.userId, partner.id, query);
  }
}
