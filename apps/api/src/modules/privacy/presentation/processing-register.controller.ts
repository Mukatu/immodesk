import { Controller, Get, Headers } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import { DomainError } from '../../../shared/errors/domain-error';
import { isUuid } from '../../../shared/ids/uuid';
import {
  ProcessingRegisterService,
  type ProcessingRegisterView,
} from '../application/processing-register.service';

/**
 * `GET /v1/privacy/processing-register` (contrat, arbitrage 13) : ouvert à
 * tout authentifié, `X-Organization-Id` ACCEPTÉ sans être EXIGÉ — ni
 * `@Roles`, ni `@RequireOrganization` (même construction que
 * `SubscriptionPlansController`, phase 10). `503 PRIVACY.REGISTER_UNAVAILABLE`
 * si le registre ne peut pas être construit.
 */
@ApiTags('Vie privée — registre')
@ApiBearerAuth()
@Controller('privacy/processing-register')
export class ProcessingRegisterController {
  constructor(private readonly register: ProcessingRegisterService) {}

  @Get()
  @ApiHeader({
    name: 'X-Organization-Id',
    required: false,
    description:
      'Si présent et que l’appelant en est membre, joint la section `organization` (DPO, durées).',
  })
  @ApiOperation({ summary: 'Registre des traitements' })
  @ApiResponse({ status: 200, description: 'ProcessingRegister' })
  @ApiResponse({ status: 503, description: 'PRIVACY.REGISTER_UNAVAILABLE' })
  async get(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers('x-organization-id') organizationIdHeader: string | undefined,
  ): Promise<ProcessingRegisterView> {
    if (!user) throw new DomainError('IAM.UNAUTHENTICATED');
    const organizationId =
      organizationIdHeader && isUuid(organizationIdHeader) ? organizationIdHeader : null;
    return this.register.get(user.userId, organizationId);
  }
}
