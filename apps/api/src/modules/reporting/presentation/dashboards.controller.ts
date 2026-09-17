import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import {
  ArrearsDashboardService,
  type ArrearsDashboardView,
} from '../application/arrears-dashboard.service';
import {
  CollectionRateDashboardService,
  type CollectionRateDashboardView,
} from '../application/collection-rate-dashboard.service';
import {
  PaymentMethodsDashboardService,
  type PaymentMethodsDashboardView,
} from '../application/payment-methods-dashboard.service';
import {
  VacancyDashboardService,
  type VacancyDashboardView,
} from '../application/vacancy-dashboard.service';
import {
  ArrearsQueryDto,
  CollectionRateQueryDto,
  PaymentMethodsQueryDto,
  VacancyQueryDto,
} from './dto/reporting.dto';

/**
 * Quatre tableaux de bord (`GET /v1/dashboards/*`, contrat phase 9) :
 * lecture seule, filtrables par période / immeuble / bailleur, accessibles
 * au rôle `VIEWER`. Même convention que `ReconciliationDashboardController`
 * (module `reconciliation`) — un contrôleur mince qui délègue entièrement au
 * service applicatif.
 */
@ApiTags('Tableaux de bord')
@ApiBearerAuth()
@Controller('dashboards')
export class DashboardsController {
  constructor(
    private readonly collectionRate: CollectionRateDashboardService,
    private readonly arrears: ArrearsDashboardService,
    private readonly vacancy: VacancyDashboardService,
    private readonly paymentMethods: PaymentMethodsDashboardService,
  ) {}

  @Get('collection-rate')
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Recouvrement : dû, encaissé, taux, série mensuelle, par immeuble' })
  async collectionRateDashboard(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: CollectionRateQueryDto,
  ): Promise<CollectionRateDashboardView> {
    return this.collectionRate.get(tenant.organizationId, tenant.userId, query);
  }

  @Get('arrears')
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Impayés : tranches d’ancienneté et locataires les plus en retard' })
  async arrearsDashboard(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ArrearsQueryDto,
  ): Promise<ArrearsDashboardView> {
    return this.arrears.get(tenant.organizationId, tenant.userId, query);
  }

  @Get('vacancy')
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Vacance : lots occupés / vacants, taux, durée moyenne de vacance' })
  async vacancyDashboard(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: VacancyQueryDto,
  ): Promise<VacancyDashboardView> {
    return this.vacancy.get(tenant.organizationId, tenant.userId, query);
  }

  @Get('payment-methods')
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Encaissements par mode de paiement (bancarisation progressive)' })
  async paymentMethodsDashboard(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: PaymentMethodsQueryDto,
  ): Promise<PaymentMethodsDashboardView> {
    return this.paymentMethods.get(tenant.organizationId, tenant.userId, query);
  }
}
