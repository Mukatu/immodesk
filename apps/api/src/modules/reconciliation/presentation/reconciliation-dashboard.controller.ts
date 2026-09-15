import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import {
  DashboardService,
  type ReconciliationDashboardView,
} from '../application/dashboard.service';
import { DashboardQueryDto } from './dto/reconciliation.dto';

/**
 * `GET /reconciliation/dashboard?bankAccountId=` (docs/api/phase6-contract.md
 * § « Routes »), rôle MANAGER : c'est le seul point de la phase 6 réservé au
 * MANAGER, les autres routes étant ACCOUNTANT.
 */
@ApiTags('Rapprochement bancaire')
@ApiBearerAuth()
@Controller('reconciliation/dashboard')
export class ReconciliationDashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Tableau de bord du rapprochement bancaire' })
  async get(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: DashboardQueryDto,
  ): Promise<ReconciliationDashboardView> {
    return this.dashboard.get(tenant.organizationId, tenant.userId, {
      bankAccountId: query.bankAccountId,
    });
  }
}
