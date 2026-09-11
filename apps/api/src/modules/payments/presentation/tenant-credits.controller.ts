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
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import { toAmount } from '../../../shared/money/amount';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { TenantCreditsService } from '../application/tenant-credits.service';
import { TenantStatementService } from '../application/tenant-statement.service';
import { ApplyCreditDto, StatementQueryDto } from './dto/payments.dto';
import {
  ApplyCreditResultDto,
  TenantCreditListDto,
  TenantStatementDto,
} from './dto/payments-response.dto';

@ApiTags('Avoirs et relevé locataire')
@ApiBearerAuth()
@Controller('tenants/:id')
export class TenantCreditsController {
  constructor(
    private readonly credits: TenantCreditsService,
    private readonly statements: TenantStatementService,
  ) {}

  @Get('credits')
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Avoirs du locataire et solde disponible' })
  @ApiResponse({ status: 200, type: TenantCreditListDto })
  async list(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) tenantId: string,
  ): Promise<TenantCreditListDto> {
    return this.credits.list(tenant.organizationId, tenant.userId, tenantId);
  }

  @Post('credits/:creditId/apply')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Imputer un avoir sur une facture',
    description:
      'Aucun nouveau paiement : deux imputations sont écrites sur le paiement source ' +
      '(contre-imputation de l’avoir, imputation de la facture).',
  })
  @ApiResponse({ status: 200, type: ApplyCreditResultDto })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'PAYMENTS.CREDIT_NOT_APPLICABLE',
  })
  async apply(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) tenantId: string,
    @Param('creditId', ParseUUIDPipe) creditId: string,
    @Body() dto: ApplyCreditDto,
  ): Promise<ApplyCreditResultDto> {
    return this.credits.apply(tenant.organizationId, tenant.userId, tenantId, creditId, {
      invoiceId: dto.invoiceId,
      amount: dto.amount !== undefined ? toAmount(dto.amount) : undefined,
    }) as Promise<ApplyCreditResultDto>;
  }

  @Get('statement')
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Relevé de compte du locataire' })
  @ApiResponse({ status: 200, type: TenantStatementDto })
  async statement(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) tenantId: string,
    @Query() query: StatementQueryDto,
  ): Promise<TenantStatementDto> {
    return this.statements.statement(tenant.organizationId, tenant.userId, tenantId, query);
  }
}
