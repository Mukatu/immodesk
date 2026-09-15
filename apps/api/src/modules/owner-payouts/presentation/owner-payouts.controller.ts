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
import {
  CurrentOrganizationId,
  CurrentUser,
  Roles,
  type AuthenticatedUser,
} from '../../../shared/auth/auth.contracts';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { ORG_HEADER, requireUser } from '../../parties/presentation/landlords.controller';
import {
  OwnerPayoutsService,
  type CreatePayoutInput,
  type ExecutePayoutInput,
} from '../application/owner-payouts.service';
import { OwnerPayoutsQueryService } from '../application/owner-payouts-query.service';
import {
  CreatePayoutDto,
  ExecutePayoutDto,
  FailPayoutDto,
  ListOwnerPayoutsQueryDto,
  PayoutDto,
  PayoutPageDto,
} from './dto/owner-payouts.dto';

/** Contrôleur `owner-payouts` (contrat, § Reversements) : voir `application/owner-payouts.service.ts`. */
@ApiTags('Reversements')
@ApiBearerAuth()
@Controller('owner-payouts')
export class OwnerPayoutsController {
  constructor(
    private readonly payouts: OwnerPayoutsService,
    private readonly queries: OwnerPayoutsQueryService,
  ) {}

  @Post()
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Créer un reversement (statut initial PENDING) sur un relevé ISSUED ou SENT',
  })
  @ApiResponse({ status: 201, type: PayoutDto })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description:
      'AGENCY.PAYOUT_ALREADY_EXISTS, AGENCY.PAYOUT_MISSING_BANK_DETAILS, AGENCY.STATEMENT_BALANCE_NOT_POSITIVE',
  })
  async create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: CreatePayoutDto,
  ): Promise<PayoutDto> {
    return this.payouts.create(
      organizationId,
      requireUser(user),
      dto as unknown as CreatePayoutInput,
    ) as Promise<PayoutDto>;
  }

  @Get()
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister les reversements' })
  @ApiResponse({ status: 200, type: PayoutPageDto })
  async list(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: ListOwnerPayoutsQueryDto,
  ): Promise<PayoutPageDto> {
    return this.queries.list(organizationId, requireUser(user), query) as Promise<PayoutPageDto>;
  }

  @Post(':id/approve')
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Valider un reversement PENDING (statut APPROVED)' })
  @ApiResponse({ status: 200, type: PayoutDto })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'AGENCY.PAYOUT_INVALID_TRANSITION',
  })
  async approve(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PayoutDto> {
    return this.payouts.approve(organizationId, requireUser(user), id) as Promise<PayoutDto>;
  }

  @Post(':id/execute')
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Exécuter un reversement APPROVED (ou retenter un reversement FAILED)',
    description:
      'Virement/chèque/espèces : enregistre la référence externe déclarée et passe directement PAID. ' +
      'Mobile Money : initie (ou ré-interroge) le décaissement via MOMO_PAYOUT_INITIATOR, PROCESSING puis PAID si résolu.',
  })
  @ApiResponse({ status: 200, type: PayoutDto })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'AGENCY.PAYOUT_INVALID_TRANSITION',
  })
  async execute(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExecutePayoutDto,
  ): Promise<PayoutDto> {
    return this.payouts.execute(
      organizationId,
      requireUser(user),
      id,
      dto as unknown as ExecutePayoutInput,
    ) as Promise<PayoutDto>;
  }

  @Post(':id/fail')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Basculer un reversement en échec (motif obligatoire)' })
  @ApiResponse({ status: 200, type: PayoutDto })
  @ApiResponse({
    status: 422,
    type: ErrorResponseDto,
    description: 'AGENCY.PAYOUT_FAILURE_REASON_REQUIRED',
  })
  async fail(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FailPayoutDto,
  ): Promise<PayoutDto> {
    return this.payouts.fail(
      organizationId,
      requireUser(user),
      id,
      dto.reason,
    ) as Promise<PayoutDto>;
  }
}
