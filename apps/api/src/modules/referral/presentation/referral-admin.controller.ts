import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import { ReferralCommissionsAdminService } from '../application/referral-commissions-admin.service';
import { ReferralPayoutsAdminService } from '../application/referral-payouts-admin.service';
import { ReferralAtRiskService } from '../application/referral-at-risk.service';
import {
  ApproveCommissionsDto,
  ApproveCommissionsResponseDto,
  AtRiskListDto,
  AtRiskQueryDto,
  CreatePayoutsDto,
  CreatePayoutsResponseDto,
  ReferralPayoutDto,
} from './dto/referral-admin.dto';
import { PlatformAdmin } from '../../../shared/platform-admin/platform-admin.decorator';
import { PlatformAdminGuard } from '../../../shared/platform-admin/platform-admin.guard';
import { requireUser } from './require-user';

/**
 * Routes plateforme (`OWNER` plateforme — `PlatformAdminGuard`,
 * `shared/platform-admin/`), docs/api/phase10-contract.md § Routes.
 */
@ApiTags('Apport d’affaires — administration plateforme')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(PlatformAdminGuard)
export class ReferralAdminController {
  constructor(
    private readonly commissions: ReferralCommissionsAdminService,
    private readonly payouts: ReferralPayoutsAdminService,
    private readonly atRisk: ReferralAtRiskService,
  ) {}

  @Post('referral-commissions/approve')
  @PlatformAdmin()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Campagne mensuelle d'approbation des commissions ACCRUED" })
  @ApiResponse({ status: 200, type: ApproveCommissionsResponseDto })
  async approve(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: ApproveCommissionsDto,
  ): Promise<ApproveCommissionsResponseDto> {
    return this.commissions.approve({
      partnerId: dto.partnerId,
      periodMonth: dto.periodMonth,
      approvedByUserId: requireUser(user),
    });
  }

  @Post('referral-payouts')
  @PlatformAdmin()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Créer les versements des commissions APPROVED' })
  @ApiResponse({ status: 202, type: CreatePayoutsResponseDto })
  @ApiResponse({ status: 409, description: 'REFERRALS.PAYOUT_THRESHOLD_NOT_REACHED' })
  async createPayouts(@Body() dto: CreatePayoutsDto): Promise<CreatePayoutsResponseDto> {
    const payoutIds = await this.payouts.createPayouts({ partnerId: dto.partnerId });
    return { payoutIds };
  }

  @Get('referral-payouts/:id')
  @PlatformAdmin()
  @ApiOperation({ summary: "Détail d'un versement" })
  @ApiResponse({ status: 200, type: ReferralPayoutDto })
  @ApiResponse({ status: 404, description: 'REFERRALS.NOT_FOUND' })
  async getPayout(@Param('id', ParseUUIDPipe) id: string): Promise<ReferralPayoutDto> {
    return this.payouts.getById(id);
  }

  @Get('subscriptions/at-risk')
  @PlatformAdmin()
  @ApiOperation({ summary: 'Abonnements PAST_DUE, proches de la suspension' })
  @ApiResponse({ status: 200, type: AtRiskListDto })
  async listAtRisk(@Query() query: AtRiskQueryDto): Promise<AtRiskListDto> {
    const { items } = await this.atRisk.list(query.limit);
    return { items, pageInfo: { nextCursor: null, hasNextPage: false, limit: query.limit ?? 20 } };
  }
}
