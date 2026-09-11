import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CurrentOrganizationId,
  CurrentUser,
  Roles,
  type AuthenticatedUser,
} from '../../../shared/auth/auth.contracts';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { ORG_HEADER, requireUser } from '../../parties/presentation/landlords.controller';
import {
  CreateDepositMovementDto,
  ListDepositsQueryDto,
} from '../../leases/presentation/dto/lease-actions.dto';
import { DepositDetailDto } from '../../leases/presentation/dto/lease-response.dto';
import { DepositsQueryService } from '../application/deposits-query.service';
import { DepositsService } from '../application/deposits.service';
import type { DepositMovementType } from '../domain/deposit-rules';
import { DepositPageDto, DepositsOverviewDto } from './dto/deposits.dto';

@ApiTags('Dépôts de garantie')
@ApiBearerAuth()
@Controller()
export class DepositsController {
  constructor(
    private readonly deposits: DepositsService,
    private readonly queries: DepositsQueryService,
  ) {}

  @Get('leases/:id/deposit')
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Dépôt de garantie du bail et ses mouvements' })
  @ApiResponse({ status: 200, type: DepositDetailDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'DEPOSITS.NOT_FOUND' })
  async get(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) leaseId: string,
  ): Promise<DepositDetailDto> {
    return this.deposits.getForLease(
      organizationId,
      requireUser(user),
      leaseId,
    ) as Promise<DepositDetailDto>;
  }

  @Post('leases/:id/deposit/movements')
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Enregistrer un mouvement (encaissement, retenue, restitution)',
    description:
      'Append-only : aucune route ne modifie ni ne supprime un mouvement. Une correction se fait ' +
      'par un mouvement ADJUSTMENT ou par une contre-passation (`reversalOfId`). Les soldes et le ' +
      'statut du dépôt sont recalculés dans la même transaction.',
  })
  @ApiResponse({ status: 201, type: DepositDetailDto })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'DEPOSITS.INSUFFICIENT_BALANCE, DEPOSITS.LEASE_NOT_CLOSED',
  })
  async recordMovement(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) leaseId: string,
    @Body() dto: CreateDepositMovementDto,
  ): Promise<DepositDetailDto> {
    return this.deposits.recordMovement(organizationId, requireUser(user), leaseId, {
      ...dto,
      movementType: dto.movementType as DepositMovementType,
    }) as Promise<DepositDetailDto>;
  }

  @Get('deposits/summary')
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Total des dépôts détenus par l’organisation' })
  @ApiResponse({ status: 200, type: DepositsOverviewDto })
  async summary(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<DepositsOverviewDto> {
    return this.queries.overview(organizationId, requireUser(user)) as Promise<DepositsOverviewDto>;
  }

  @Get('deposits')
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister les dépôts de garantie' })
  @ApiResponse({ status: 200, type: DepositPageDto })
  async list(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: ListDepositsQueryDto,
  ): Promise<DepositPageDto> {
    return this.queries.list(organizationId, requireUser(user), query) as Promise<DepositPageDto>;
  }
}
