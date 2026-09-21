import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import type { TenantLeaseRow } from '../../../shared/prisma/tenant-directory.service';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { requireUser } from '../../parties/presentation/landlords.controller';
import { PdfLinkDto } from '../../receipts/presentation/dto/receipts.dto';
import { TenantReceiptsService } from '../application/tenant-receipts.service';
import { CurrentTenantLeases, TenantPortal } from './tenant-portal.decorator';
import { TenantPortalGuard } from './tenant-portal.guard';

/**
 * Quittance du locataire (contrat, § « Quittance ») : le PDF déjà produit
 * par la phase 3, avec son jeton de vérification publique inchangé
 * (`GET /v1/public/receipts/verify/:token`, module `receipts`, jamais
 * touché ici).
 */
@ApiTags('Portail locataire — quittances')
@ApiBearerAuth()
@TenantPortal()
@UseGuards(TenantPortalGuard)
@Controller('tenant/receipts')
export class TenantReceiptsController {
  constructor(private readonly receipts: TenantReceiptsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'URL signée (10 min) du PDF d’une quittance du locataire' })
  @ApiResponse({ status: 200, type: PdfLinkDto })
  @ApiResponse({
    status: 404,
    type: ErrorResponseDto,
    description: 'PARTIES.PORTAL_OUT_OF_SCOPE',
  })
  async pdf(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentTenantLeases() leases: TenantLeaseRow[],
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PdfLinkDto> {
    return this.receipts.pdf(leases, requireUser(user), id);
  }
}
