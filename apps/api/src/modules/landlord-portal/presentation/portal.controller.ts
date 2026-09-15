import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { StatementPageDto } from '../../owner-statements/presentation/dto/owner-statements.dto';
import { requireUser } from '../../parties/presentation/landlords.controller';
import { LandlordPortalQueryService } from '../application/landlord-portal-query.service';
import { CurrentLandlordLinks, LandlordPortal } from './landlord-portal.decorator';
import { LandlordPortalGuard } from './landlord-portal.guard';
import type { LandlordLinkRow } from '../../../shared/prisma/tenant-directory.service';
import {
  DownloadUrlDto,
  PortalCollectionPageDto,
  PortalCollectionsQueryDto,
  PortalMeDto,
  PortalPageQueryDto,
  PortalPayoutPageDto,
  PortalReceiptPageDto,
} from './dto/portal.dto';

/**
 * Routes du portail bailleur : toutes en lecture seule (arbitrage n°7 du
 * contrat, « toute écriture est refusée ») — ce module n'expose QUE des
 * `GET`, ce qui respecte la règle par construction, sans contrôle actif de
 * méthode HTTP à ajouter dans `LandlordPortalGuard`.
 *
 * `@LandlordPortal()` posé au niveau du contrôleur protège les six routes.
 */
@ApiTags('Portail bailleur')
@ApiBearerAuth()
@LandlordPortal()
@UseGuards(LandlordPortalGuard)
@Controller('portal')
export class PortalController {
  constructor(private readonly queries: LandlordPortalQueryService) {}

  @Get('me')
  @ApiOperation({ summary: 'Fiche du bailleur authentifié et organisations liées' })
  @ApiResponse({ status: 200, type: PortalMeDto })
  async me(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentLandlordLinks() links: LandlordLinkRow[],
  ): Promise<PortalMeDto> {
    return this.queries.me(requireUser(user), links);
  }

  @Get('statements')
  @ApiOperation({ summary: 'Relevés de gérance du bailleur, toutes agences confondues' })
  @ApiResponse({ status: 200, type: StatementPageDto })
  async statements(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentLandlordLinks() links: LandlordLinkRow[],
    @Query() query: PortalPageQueryDto,
  ): Promise<StatementPageDto> {
    return this.queries.statements(
      requireUser(user),
      links,
      query.limit,
      query.cursor,
    ) as Promise<StatementPageDto>;
  }

  @Get('statements/:id/pdf')
  @ApiOperation({ summary: 'URL signée du PDF d’un relevé' })
  @ApiResponse({ status: 200, type: DownloadUrlDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'AGENCY.STATEMENT_NOT_FOUND' })
  @ApiResponse({
    status: 503,
    type: ErrorResponseDto,
    description: 'AGENCY.STATEMENT_PDF_UNAVAILABLE',
  })
  async statementPdf(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentLandlordLinks() links: LandlordLinkRow[],
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DownloadUrlDto> {
    return this.queries.statementPdf(requireUser(user), links, id);
  }

  @Get('payouts')
  @ApiOperation({ summary: 'Reversements du bailleur' })
  @ApiResponse({ status: 200, type: PortalPayoutPageDto })
  async payouts(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentLandlordLinks() links: LandlordLinkRow[],
    @Query() query: PortalPageQueryDto,
  ): Promise<PortalPayoutPageDto> {
    return this.queries.payouts(requireUser(user), links, query.limit, query.cursor);
  }

  @Get('collections')
  @ApiOperation({ summary: 'Encaissements confirmés du bailleur' })
  @ApiResponse({ status: 200, type: PortalCollectionPageDto })
  async collections(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentLandlordLinks() links: LandlordLinkRow[],
    @Query() query: PortalCollectionsQueryDto,
  ): Promise<PortalCollectionPageDto> {
    return this.queries.collections(
      requireUser(user),
      links,
      query.from,
      query.to,
      query.limit,
      query.cursor,
    );
  }

  @Get('receipts')
  @ApiOperation({ summary: 'Quittances du bailleur' })
  @ApiResponse({ status: 200, type: PortalReceiptPageDto })
  async receipts(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentLandlordLinks() links: LandlordLinkRow[],
    @Query() query: PortalPageQueryDto,
  ): Promise<PortalReceiptPageDto> {
    return this.queries.receipts(requireUser(user), links, query.limit, query.cursor);
  }
}
