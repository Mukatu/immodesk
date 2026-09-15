import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import { DomainError } from '../../../shared/errors/domain-error';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { OnboardingInput, OnboardingService } from '../application/onboarding.service';
import {
  IndependentManagerOnboardingDto,
  IndependentManagerOnboardingResultDto,
} from './dto/onboarding.dto';

/**
 * Onboarding du gestionnaire indépendant (docs/api/phase7-contract.md, §
 * « Portail bailleur et onboarding »). Utilisateur authentifié mais PAS
 * encore membre d'une organisation : ni `@Roles(...)` ni
 * `@RequireOrganization()`, exactement comme `POST /v1/organizations`.
 */
@ApiTags('Organisations')
@ApiBearerAuth()
@Controller('organizations/independent-manager')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Post('onboarding')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Onboarding du gestionnaire indépendant',
    description:
      "Crée en une seule transaction l'organisation `INDEPENDENT_MANAGER`, un bailleur, un bien " +
      'et un mandat de gestion avec la commission par défaut (10 %). Parcours mobile-first visé ' +
      'à moins de dix minutes.',
  })
  @ApiResponse({ status: 201, type: IndependentManagerOnboardingResultDto })
  @ApiResponse({ status: 422, type: ErrorResponseDto })
  async onboardIndependentManager(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: IndependentManagerOnboardingDto,
  ): Promise<IndependentManagerOnboardingResultDto> {
    return this.onboarding.onboardIndependentManager(
      requireUser(user),
      dto as unknown as OnboardingInput,
    ) as Promise<IndependentManagerOnboardingResultDto>;
  }
}

function requireUser(user: AuthenticatedUser | undefined): string {
  if (!user) throw new DomainError('IAM.UNAUTHENTICATED');
  return user.userId;
}
