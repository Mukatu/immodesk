import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../shared/auth/auth.contracts';
import { ReferralCodeService } from '../application/referral-code.service';
import { AttachReferralCodeDto, ReferralDto } from './dto/referral.dto';

const ORG_HEADER = {
  name: 'X-Organization-Id',
  required: true,
  description: 'Organisation courante. Positionne `app.current_organization_id` (RLS).',
};

/**
 * `POST /v1/organizations/{id}/referral-code` (docs/api/phase10-contract.md,
 * § Apport d'affaires, source `CODE_AT_SIGNUP`). Contrôleur DÉDIÉ dans le
 * module `referral` (propriétaire de `referrals`) plutôt qu'ajout à
 * `OrganizationsController` : NestJS n'exige pas qu'un préfixe de route
 * appartienne à un seul module.
 */
@ApiTags('Apport d’affaires — code de parrainage')
@ApiBearerAuth()
@Controller('organizations')
export class ReferralCodeController {
  constructor(private readonly referralCode: ReferralCodeService) {}

  @Post(':id/referral-code')
  @Roles('OWNER')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Rattacher un code de parrainage à cette organisation' })
  @ApiResponse({ status: 201, type: ReferralDto })
  @ApiResponse({ status: 404, description: 'REFERRALS.PARTNER_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'REFERRALS.ALREADY_REFERRED' })
  @ApiResponse({ status: 422, description: 'REFERRALS.SELF_REFERRAL' })
  async attach(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AttachReferralCodeDto,
  ): Promise<ReferralDto> {
    return this.referralCode.attach(id, dto.code);
  }
}
