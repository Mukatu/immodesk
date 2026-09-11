import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import { toAmount } from '../../../shared/money/amount';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { BillingDashboardService } from '../application/billing-dashboard.service';
import { BillingRunsService } from '../application/billing-runs.service';
import { PenaltyRulesService, type PenaltyRuleInput } from '../application/penalty-rules.service';
import type { PenaltyBasis } from '../domain/penalties';
import {
  DashboardQueryDto,
  PenaltyRuleInputDto,
  StartBillingRunDto,
  UpdatePenaltyRuleDto,
} from './dto/billing.dto';
import {
  BillingDashboardDto,
  BillingRunAcceptedDto,
  BillingRunDto,
  PenaltyRuleDto,
  PenaltyRuleListDto,
} from './dto/billing-response.dto';

function toRuleInput(dto: Partial<PenaltyRuleInputDto>): Partial<PenaltyRuleInput> {
  return {
    ...(dto.name !== undefined ? { name: dto.name } : {}),
    ...(dto.basis !== undefined ? { basis: dto.basis as PenaltyBasis } : {}),
    ...(dto.rateBps !== undefined ? { rateBps: dto.rateBps } : {}),
    ...(dto.flatAmount !== undefined ? { flatAmount: toAmount(dto.flatAmount) } : {}),
    ...(dto.graceDays !== undefined ? { graceDays: dto.graceDays } : {}),
    ...(dto.capAmount !== undefined ? { capAmount: toAmount(dto.capAmount) } : {}),
    ...(dto.capRateBps !== undefined ? { capRateBps: dto.capRateBps } : {}),
    ...(dto.maxPeriods !== undefined ? { maxPeriods: dto.maxPeriods } : {}),
    ...(dto.appliesToCharges !== undefined ? { appliesToCharges: dto.appliesToCharges } : {}),
    ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
  };
}

@ApiTags('Facturation')
@ApiBearerAuth()
@Controller()
export class BillingController {
  constructor(
    private readonly runs: BillingRunsService,
    private readonly dashboard: BillingDashboardService,
    private readonly penaltyRules: PenaltyRulesService,
  ) {}

  @Post('billing/runs')
  @Roles('OWNER')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Lancer une campagne de facturation',
    description:
      'Même logique que le cron quotidien, pour l’organisation courante. `periodStart` cible une ' +
      'période précise, `dryRun` compte sans rien écrire. Rapport conservé 7 jours.',
  })
  @ApiResponse({ status: 202, type: BillingRunAcceptedDto })
  async startRun(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: StartBillingRunDto,
  ): Promise<BillingRunAcceptedDto> {
    return this.runs.start(tenant.organizationId, tenant.userId, {
      periodStart: dto.periodStart?.slice(0, 10),
      dryRun: dto.dryRun,
    });
  }

  @Get('billing/runs/:runId')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Rapport d’une campagne de facturation' })
  @ApiResponse({ status: 200, type: BillingRunDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'BILLING.RUN_NOT_FOUND' })
  async getRun(
    @CurrentTenant() tenant: TenantContext,
    @Param('runId', ParseUUIDPipe) runId: string,
  ): Promise<BillingRunDto> {
    const { organizationId: _organizationId, ...report } = await this.runs.get(
      tenant.organizationId,
      runId,
    );
    return report;
  }

  @Get('billing/dashboard')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Tableau de bord mensuel d’encaissement' })
  @ApiResponse({ status: 200, type: BillingDashboardDto })
  async getDashboard(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: DashboardQueryDto,
  ): Promise<BillingDashboardDto> {
    return this.dashboard.monthly(tenant.organizationId, tenant.userId, query.period);
  }

  @Get('penalty-rules')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Règles de pénalité de retard' })
  @ApiResponse({ status: 200, type: PenaltyRuleListDto })
  async listPenaltyRules(@CurrentTenant() tenant: TenantContext): Promise<PenaltyRuleListDto> {
    return this.penaltyRules.list(tenant.organizationId, tenant.userId);
  }

  @Post('penalty-rules')
  @Roles('OWNER')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Créer une règle de pénalité' })
  @ApiResponse({ status: 201, type: PenaltyRuleDto })
  @ApiResponse({ status: 422, type: ErrorResponseDto, description: 'BILLING.PENALTY_RULE_INVALID' })
  async createPenaltyRule(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: PenaltyRuleInputDto,
  ): Promise<PenaltyRuleDto> {
    return this.penaltyRules.create(
      tenant.organizationId,
      tenant.userId,
      toRuleInput(dto) as PenaltyRuleInput,
    );
  }

  @Patch('penalty-rules/:id')
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Modifier une règle de pénalité' })
  @ApiResponse({ status: 200, type: PenaltyRuleDto })
  async updatePenaltyRule(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePenaltyRuleDto,
  ): Promise<PenaltyRuleDto> {
    return this.penaltyRules.update(tenant.organizationId, tenant.userId, id, toRuleInput(dto));
  }
}
