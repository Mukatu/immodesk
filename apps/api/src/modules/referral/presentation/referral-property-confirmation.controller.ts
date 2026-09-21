import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../shared/auth/auth.contracts';
import { ReferralPropertyLeadService } from '../application/referral-property-lead.service';
import { ConfirmPropertyLeadDto } from './dto/referral-partners.dto';
import { ReferralDto } from './dto/referral.dto';

/**
 * Confirmation PUBLIQUE, par le bailleur, de l'apport d'affaires
 * (docs/api/phase10-contract.md, § Apport d'affaires ; pattern calqué sur
 * `landlord-portal/presentation/portal-activation.controller.ts`). Route
 * SÉPARÉE de `ReferralPartnersController` (qui exige `ReferralPartnerGuard`)
 * bien que son chemin soit imbriqué sous `referral-partners/me/...` dans le
 * contrat : le bailleur n'est ni authentifié, ni partenaire.
 */
@ApiTags('Apport d’affaires — confirmation bailleur')
@Controller('referral-partners/me/properties')
export class ReferralPropertyConfirmationController {
  constructor(private readonly leads: ReferralPropertyLeadService) {}

  @Post(':id/confirm-otp')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Le bailleur confirme l'apport par code à usage unique" })
  @ApiResponse({ status: 201, type: ReferralDto })
  @ApiResponse({ status: 404, description: 'REFERRALS.NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'REFERRALS.ALREADY_REFERRED' })
  @ApiResponse({ status: 422, description: 'REFERRALS.SELF_REFERRAL' })
  async confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmPropertyLeadDto,
  ): Promise<ReferralDto> {
    return this.leads.confirm(id, dto.code);
  }
}
