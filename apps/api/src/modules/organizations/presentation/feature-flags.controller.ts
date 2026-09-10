import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CurrentOrganizationId,
  CurrentUser,
  RequireOrganization,
  type AuthenticatedUser,
} from '../../../shared/auth/auth.contracts';
import { DomainError } from '../../../shared/errors/domain-error';
import { FeatureFlagsService } from '../application/feature-flags.service';
import { FeatureFlagsDto } from './dto/organizations.dto';

@ApiTags('Organisations')
@ApiBearerAuth()
@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private readonly featureFlags: FeatureFlagsService) {}

  @Get()
  @RequireOrganization()
  @ApiHeader({
    name: 'X-Organization-Id',
    required: true,
    description: "Organisation courante. Positionne `app.current_organization_id` (RLS).",
  })
  @ApiOperation({
    summary: "Drapeaux actifs pour l'organisation courante",
    description:
      "Réunit les drapeaux globaux (`organization_id` nul) et ceux du tenant ; en cas de clé commune, celui du tenant l'emporte. Les fenêtres `starts_at`/`ends_at` sont respectées.",
  })
  @ApiResponse({ status: 200, type: FeatureFlagsDto })
  async list(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentOrganizationId() organizationId: string,
  ): Promise<FeatureFlagsDto> {
    if (!user) throw new DomainError('IAM.UNAUTHENTICATED');
    return { flags: await this.featureFlags.listForOrganization(organizationId, user.userId) };
  }
}
