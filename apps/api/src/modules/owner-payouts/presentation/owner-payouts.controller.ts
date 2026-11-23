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
  ResolveMomoPayoutDto,
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

  @Post(':id/momo-resolution')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Résoudre un décaissement Mobile Money bloqué (issue incertaine), après vérification',
    description:
      'Réservé à OWNER, audité (OWNER_PAYOUT_MOMO_RESOLVED). À utiliser quand un ordre d’exécution ' +
      'a une issue incertaine (timeout, erreur réseau) : vérifier le retrait chez OpenPay, puis ' +
      'relancer, marquer payé ou marquer échoué. N’émet jamais de virement.',
  })
  @ApiResponse({ status: 200, type: PayoutDto })
  @ApiResponse({
    status: 400,
    type: ErrorResponseDto,
    description: 'VALIDATION.INVALID_PAYLOAD : identifiant de reversement qui n’est pas un UUID.',
  })
  @ApiResponse({
    status: 422,
    type: ErrorResponseDto,
    description:
      'VALIDATION.INVALID_PAYLOAD : résolution inconnue ou motif hors de 10 à 1000 caractères.',
  })
  @ApiResponse({
    status: 403,
    type: ErrorResponseDto,
    description: 'Rôle insuffisant (OWNER requis) ou organisation non autorisée.',
  })
  @ApiResponse({
    status: 404,
    type: ErrorResponseDto,
    description:
      'AGENCY.PAYOUT_NOT_FOUND (reversement absent de cette organisation), MOMO.NOT_FOUND',
  })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description:
      'MOMO.RESOLUTION_REFUSED (statut du retrait chez le fournisseur, ordre récent, RETRY avant le délai ' +
      'MOMO_PAYOUT_RETRY_MIN_AGE_MINUTES ou ligne non bloquée), ' +
      'AGENCY.PAYOUT_INVALID_TRANSITION, MOMO.INVALID_TRANSITION',
  })
  async resolveMomo(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveMomoPayoutDto,
  ): Promise<PayoutDto> {
    return this.payouts.resolveMomoBlocked(
      organizationId,
      requireUser(user),
      id,
      dto,
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
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description:
      'AGENCY.PAYOUT_INVALID_TRANSITION, ou MOMO.RESOLUTION_REFUSED : décaissement Mobile Money en vol ' +
      '(le virement peut encore partir), utiliser momo-resolution.',
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
