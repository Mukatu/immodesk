import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../shared/auth/auth.contracts';
import { LegalService } from '../application/legal.service';
import { StatusService, type PlatformStatusReport } from '../application/status.service';
import { LegalTermsDto, PlatformStatusDto } from './dto/platform-public.dto';

/**
 * Routes publiques, sans authentification ni `X-Organization-Id`
 * (docs/api/phase11-contract.md, § Routes, arbitrage 18) : `GET /v1/status`
 * (bandeau permanent) et `GET /v1/legal` (mentions légales).
 */
@ApiTags('Plateforme')
@Controller()
export class PlatformPublicController {
  constructor(
    private readonly status: StatusService,
    private readonly legal: LegalService,
  ) {}

  @Get('status')
  @Public()
  @ApiOperation({
    summary: 'État public de la plateforme',
    description:
      'Source du bandeau permanent (`readOnly`) : sondes de disponibilité, incident courant, maintenance annoncée. Ne nomme aucune organisation ni aucun tiers.',
  })
  @ApiResponse({ status: 200, type: PlatformStatusDto })
  async getStatus(): Promise<PlatformStatusReport> {
    return this.status.get();
  }

  @Get('legal')
  @Public()
  @ApiOperation({ summary: 'Mentions légales et politique de confidentialité' })
  @ApiResponse({ status: 200, type: LegalTermsDto })
  getLegal(): ReturnType<LegalService['get']> {
    return this.legal.get();
  }
}
